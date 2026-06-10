import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { ocrTrigger } from "./functions/ocr-trigger/resource";
import { ocrProcessor } from "./functions/ocr-processor/resource";
import { postConfirmation } from "./functions/post-confirmation/resource";
import { statusNotifier } from "./functions/status-notifier/resource";
import { adminCreateCustomer } from "./functions/admin-create-customer/resource";
import { adminDeleteCustomer } from "./functions/admin-delete-customer/resource";
import { syncCustomers } from "./functions/sync-customers/resource";
import { broadcastEmail } from "./functions/broadcast-email/resource";
import { unsubscribe } from "./functions/unsubscribe/resource";
import { sesEvents } from "./functions/ses-events/resource";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cr from "aws-cdk-lib/custom-resources";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { EventType } from "aws-cdk-lib/aws-s3";
import { Duration } from "aws-cdk-lib";

const backend = defineBackend({
  auth,
  data,
  storage,
  ocrTrigger,
  ocrProcessor,
  postConfirmation,
  statusNotifier,
  adminCreateCustomer,
  adminDeleteCustomer,
  syncCustomers,
  broadcastEmail,
  unsubscribe,
  sesEvents,
});

// ─── Cognito App Client: enable USER_PASSWORD_AUTH ───────────────────────────
const { cfnUserPoolClient, cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPoolClient.explicitAuthFlows = [
  "ALLOW_USER_SRP_AUTH",
  "ALLOW_USER_PASSWORD_AUTH",
  "ALLOW_REFRESH_TOKEN_AUTH",
];

// ─── Cognito: use SES for branded verification emails ────────────────────────
// Requires info@cargolinkbarbados.com (or domain) to be verified in SES us-east-1
cfnUserPool.emailConfiguration = {
  emailSendingAccount: "DEVELOPER",
  from: "CargoLink Barbados <info@cargolinkbarbados.com>",
  sourceArn: `arn:aws:ses:us-east-1:${cfnUserPool.stack.account}:identity/cargolinkbarbados.com`,
};

// ─── Step Functions: OCR State Machine ───────────────────────────────────────
// IMPORTANT: Build the state machine in the STORAGE stack (where ocrTrigger lives)
// to avoid a three-way circular dependency: storage → auth → data → storage.
// The ocrProcessor Lambda (data stack) is referenced as an IFunction, which only
// creates a one-way dependency: storage → data (acceptable, no cycle).
const ocrProcessorFn = backend.ocrProcessor.resources.lambda as lambda.Function;
const ocrTriggerLambda = backend.ocrTrigger.resources.lambda as lambda.Function;
const storageStack = ocrTriggerLambda.stack; // storage stack

const startTextract = new tasks.LambdaInvoke(storageStack, "StartTextractJob", {
  lambdaFunction: ocrProcessorFn,
  payload: sfn.TaskInput.fromObject({
    action: "START",
    "s3Key.$": "$.s3Key",
    "s3Bucket.$": "$.s3Bucket",
  }),
  resultPath: "$.textractJob",
});

const waitForTextract = new sfn.Wait(storageStack, "WaitForTextract", {
  time: sfn.WaitTime.duration(Duration.seconds(15)),
});

const checkTextract = new tasks.LambdaInvoke(storageStack, "CheckTextractJob", {
  lambdaFunction: ocrProcessorFn,
  payload: sfn.TaskInput.fromObject({
    action: "CHECK",
    "jobId.$": "$.textractJob.Payload.jobId",
    "s3Key.$": "$.s3Key",
  }),
  resultPath: "$.textractResult",
});

const jobComplete = new sfn.Choice(storageStack, "IsJobComplete");

const persistResults = new tasks.LambdaInvoke(storageStack, "PersistOCRResults", {
  lambdaFunction: ocrProcessorFn,
  payload: sfn.TaskInput.fromObject({
    action: "PERSIST",
    "blocks.$": "$.textractResult.Payload.blocks",
    "s3Key.$": "$.s3Key",
    "s3Bucket.$": "$.s3Bucket",
    "uploadedBy.$": "$.uploadedBy",
    "shipmentId.$": "$.shipmentId",
  }),
});

const ocrFailed = new sfn.Fail(storageStack, "OCRFailed", {
  cause: "Textract job failed",
});

const definition = startTextract
  .next(waitForTextract)
  .next(checkTextract)
  .next(
    jobComplete
      .when(
        sfn.Condition.stringEquals(
          "$.textractResult.Payload.status",
          "SUCCEEDED"
        ),
        persistResults
      )
      .when(
        sfn.Condition.stringEquals(
          "$.textractResult.Payload.status",
          "FAILED"
        ),
        ocrFailed
      )
      .otherwise(waitForTextract)
  );

const ocrStateMachine = new sfn.StateMachine(storageStack, "OCRStateMachine", {
  definitionBody: sfn.DefinitionBody.fromChainable(definition),
  tracingEnabled: true,
  timeout: Duration.minutes(10),
});

// ocrTrigger is in storage stack — same stack as state machine, no cross-stack ref
ocrStateMachine.grantStartExecution(ocrTriggerLambda);
ocrTriggerLambda.addEnvironment(
  "STATE_MACHINE_ARN",
  ocrStateMachine.stateMachineArn
);

// ocrProcessor Textract permissions (data stack — no cross-stack issue)
ocrProcessorFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "textract:StartDocumentTextDetection",
      "textract:GetDocumentTextDetection",
    ],
    resources: ["*"],
  })
);

// ─── S3 → ocr-trigger notification ───────────────────────────────────────────
// Both bucket and ocrTrigger are in storage stack — no cross-stack ref
const storageBucket = backend.storage.resources.bucket;
storageBucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(ocrTriggerLambda),
  { prefix: "receipts/" }
);

// ─── SES: status-notifier email permissions ──────────────────────────────────
const statusNotifierFn = backend.statusNotifier.resources.lambda as lambda.Function;
const SES_IDENTITY_ARN = `arn:aws:ses:us-east-1:${backend.auth.resources.cfnResources.cfnUserPool.stack.account}:identity/cargolinkbarbados.com`;

statusNotifierFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: [SES_IDENTITY_ARN],
  })
);
statusNotifierFn.addEnvironment("SENDER_EMAIL", "info@cargolinkbarbados.com");
if (process.env.APP_URL) {
  statusNotifierFn.addEnvironment("APP_URL", process.env.APP_URL);
}

// ─── broadcastEmail: SES + async self-invoke permissions ─────────────────────
const broadcastEmailFn = backend.broadcastEmail.resources.lambda as lambda.Function;

broadcastEmailFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: [SES_IDENTITY_ARN],
  })
);
// The mutation invocation re-invokes the same function asynchronously to do the
// actual sending so the AppSync call returns immediately. resources: ["*"] avoids
// a self-referencing CFN dependency between the function and its own role policy.
broadcastEmailFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["lambda:InvokeFunction"],
    resources: ["*"],
  })
);
broadcastEmailFn.addEnvironment("SENDER_EMAIL", "info@cargolinkbarbados.com");
if (process.env.APP_URL) {
  broadcastEmailFn.addEnvironment("APP_URL", process.env.APP_URL);
}
// GRAPHQL_API_ENDPOINT is auto-injected as AMPLIFY_DATA_GRAPHQL_ENDPOINT
// via allow.resource(broadcastEmail) in data/resource.ts.
// AppSync query permissions (listCustomers) are also granted automatically.

// ─── unsubscribe: public function URL + shared HMAC secret ───────────────────
// UNSUBSCRIBE_SECRET signs the customerId in unsubscribe links. Set it as a
// branch env var in the Amplify Console for production; the fallback default
// in the handlers keeps sandbox working.
const unsubscribeFn = backend.unsubscribe.resources.lambda as lambda.Function;
const unsubscribeUrl = unsubscribeFn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});
if (process.env.UNSUBSCRIBE_SECRET) {
  unsubscribeFn.addEnvironment("UNSUBSCRIBE_SECRET", process.env.UNSUBSCRIBE_SECRET);
  broadcastEmailFn.addEnvironment("UNSUBSCRIBE_SECRET", process.env.UNSUBSCRIBE_SECRET);
}
// Both functions live in the data stack, so this reference creates no cycle.
broadcastEmailFn.addEnvironment("UNSUBSCRIBE_URL", unsubscribeUrl.url);

// ─── sesEvents: SES bounce/complaint notifications → SNS → Lambda ────────────
const sesEventsFn = backend.sesEvents.resources.lambda as lambda.Function;
const sesNotificationsTopic = new sns.Topic(sesEventsFn.stack, "SesNotificationsTopic", {
  displayName: "CargoLink SES bounce and complaint notifications",
});
sesNotificationsTopic.addSubscription(
  new snsSubscriptions.LambdaSubscription(sesEventsFn)
);

// Point the SES identity's Bounce + Complaint notifications at the topic.
// The identity (cargolinkbarbados.com) is account-level and already required
// for sending, so it exists in every environment that can send email.
for (const notificationType of ["Bounce", "Complaint"] as const) {
  new cr.AwsCustomResource(sesEventsFn.stack, `Ses${notificationType}Notification`, {
    onCreate: {
      service: "SES",
      action: "setIdentityNotificationTopic",
      parameters: {
        Identity: "cargolinkbarbados.com",
        NotificationType: notificationType,
        SnsTopic: sesNotificationsTopic.topicArn,
      },
      physicalResourceId: cr.PhysicalResourceId.of(`ses-${notificationType.toLowerCase()}-notification`),
    },
    onUpdate: {
      service: "SES",
      action: "setIdentityNotificationTopic",
      parameters: {
        Identity: "cargolinkbarbados.com",
        NotificationType: notificationType,
        SnsTopic: sesNotificationsTopic.topicArn,
      },
      physicalResourceId: cr.PhysicalResourceId.of(`ses-${notificationType.toLowerCase()}-notification`),
    },
    policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
      resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
    }),
  });
}

// ─── adminCreateCustomer: Cognito + SES + AppSync permissions ────────────────
const adminCreateCustomerFn = backend.adminCreateCustomer.resources.lambda as lambda.Function;

// NOTE: Use resources: ["*"] (not userPool.userPoolArn) to avoid a cross-stack
// CDK token reference from data stack → auth stack, which would create a cycle
// because auth stack already depends on data stack (postConfirmation trigger).
adminCreateCustomerFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:ListUserPools",
    ],
    resources: ["*"],
  })
);

adminCreateCustomerFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: [SES_IDENTITY_ARN],
  })
);

// USER_POOL_ID and APP_URL are set as branch-specific env vars in the Amplify Console.
// They're available at CDK synth time via process.env, so we pass them through here.
// This is safe — plain strings, not CDK token refs, so no cross-stack cycle.
if (process.env.USER_POOL_ID) {
  adminCreateCustomerFn.addEnvironment("USER_POOL_ID", process.env.USER_POOL_ID);
}
if (process.env.APP_URL) {
  adminCreateCustomerFn.addEnvironment("APP_URL", process.env.APP_URL);
}
adminCreateCustomerFn.addEnvironment("SENDER_EMAIL", "info@cargolinkbarbados.com");
// GRAPHQL_API_ENDPOINT is auto-injected as AMPLIFY_DATA_GRAPHQL_ENDPOINT
// via allow.resource(adminCreateCustomer) in data/resource.ts.
// AppSync mutation permissions are also granted automatically by allow.resource().

// ─── adminDeleteCustomer: Cognito delete + AppSync permissions ───────────────
const adminDeleteCustomerFn = backend.adminDeleteCustomer.resources.lambda as lambda.Function;

// NOTE: Use resources: ["*"] (not userPool.userPoolArn) to avoid a cross-stack
// CDK token reference from data stack → auth stack, which would create a cycle
// because auth stack already depends on data stack (postConfirmation trigger).
adminDeleteCustomerFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:ListUserPools",
    ],
    resources: ["*"],
  })
);

if (process.env.USER_POOL_ID) {
  adminDeleteCustomerFn.addEnvironment("USER_POOL_ID", process.env.USER_POOL_ID);
}
// GRAPHQL_API_ENDPOINT is auto-injected as AMPLIFY_DATA_GRAPHQL_ENDPOINT
// via allow.resource(adminDeleteCustomer) in data/resource.ts.
// AppSync mutation permissions are also granted automatically by allow.resource().

// ─── syncCustomers: Cognito list + AppSync read/write permissions ─────────────
const syncCustomersFn = backend.syncCustomers.resources.lambda as lambda.Function;

// NOTE: Use resources: ["*"] to avoid a CDK cross-stack cycle (data → auth).
// USER_POOL_ID is set as a branch-specific env var in the Amplify Console — not here.
syncCustomersFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["cognito-idp:ListUsersInGroup", "cognito-idp:ListUserPools"],
    resources: ["*"],
  })
);

if (process.env.USER_POOL_ID) {
  syncCustomersFn.addEnvironment("USER_POOL_ID", process.env.USER_POOL_ID);
}
// GRAPHQL_API_ENDPOINT is auto-injected as AMPLIFY_DATA_GRAPHQL_ENDPOINT
// via allow.resource(syncCustomers) in data/resource.ts.
// AppSync query/mutation permissions are also granted automatically.

// ─── postConfirmation: Cognito + AppSync + SES permissions ───────────────────
const postConfirmationFn = backend.postConfirmation.resources.lambda as lambda.Function;

// Grant Cognito admin permissions with resources: ["*"] to avoid a CDK cycle.
postConfirmationFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminUpdateUserAttributes",
    ],
    resources: ["*"],
  })
);

// postConfirmation is in auth stack. We CANNOT use allow.resource() in the data
// schema or grantMutation() because both create auth→data CDK token refs, and
// data already depends on auth (UserPool) → cycle. Instead, grant AppSync access
// via a broad IAM policy and pass the endpoint as a hardcoded env var.
postConfirmationFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["appsync:GraphQL", "appsync:ListGraphqlApis"],
    resources: ["*"],
  })
);

// SES permission so postConfirmation can email admins on new sign-ups
postConfirmationFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: [SES_IDENTITY_ARN],
  })
);

// Admin notification email — change ADMIN_NOTIFY_EMAIL to your preferred inbox
postConfirmationFn.addEnvironment("SENDER_EMAIL",       "info@cargolinkbarbados.com");
postConfirmationFn.addEnvironment("ADMIN_NOTIFY_EMAIL", "christophercorbin24@gmail.com");

// IMPORTANT: Cannot use CDK tokens from data stack here because data already
// depends on auth (UserPool) — any auth→data reference creates a cycle.
// The postConfirmation Lambda resolves the endpoint at runtime by calling
// AppSync DescribeGraphqlApi or reading from SSM. We grant broad appsync:*
// and ssm:GetParameter permissions, and the Lambda handler falls back to
// looking up the endpoint dynamically if AMPLIFY_DATA_GRAPHQL_ENDPOINT is unset.

// ─── Error alerting: CloudWatch alarms → SNS → email ─────────────────────────
// The alerts topic lives in its OWN stack so every other stack can reference it
// without creating circular dependencies (the alerting stack depends on nothing).
const alertingStack = backend.createStack("alerting");
const alertsTopic = new sns.Topic(alertingStack, "AlertsTopic", {
  displayName: "CargoLink error alerts",
});
// Change ALERT_EMAIL (or set it as an Amplify Console env var) to your inbox.
// AWS sends a one-time "Confirm subscription" email — click it or no alerts arrive.
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? "christopher@cargolinkbarbados.com";
alertsTopic.addSubscription(new snsSubscriptions.EmailSubscription(ALERT_EMAIL));

// One error alarm per Lambda. Each alarm is created in the Lambda's own stack
// (alarm → topic is the only cross-stack reference, and it points at the
// dependency-free alerting stack — no cycles).
const monitoredFunctions: Record<string, lambda.Function> = {
  OcrTrigger: ocrTriggerLambda,
  OcrProcessor: ocrProcessorFn,
  PostConfirmation: postConfirmationFn,
  StatusNotifier: statusNotifierFn,
  AdminCreateCustomer: adminCreateCustomerFn,
  AdminDeleteCustomer: adminDeleteCustomerFn,
  SyncCustomers: syncCustomersFn,
  BroadcastEmail: broadcastEmailFn,
  Unsubscribe: unsubscribeFn,
  SesEvents: sesEventsFn,
};

for (const [name, fn] of Object.entries(monitoredFunctions)) {
  const alarm = new cloudwatch.Alarm(fn.stack, `${name}ErrorAlarm`, {
    alarmDescription: `${name} Lambda reported errors — check CloudWatch logs`,
    metric: fn.metricErrors({ period: Duration.minutes(5), statistic: "Sum" }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator:
      cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });
  alarm.addAlarmAction(new cwActions.SnsAction(alertsTopic));
  alarm.addOkAction(new cwActions.SnsAction(alertsTopic)); // recovery notice
}

// OCR Step Functions workflow failures
const ocrFailureAlarm = new cloudwatch.Alarm(storageStack, "OcrWorkflowFailedAlarm", {
  alarmDescription: "OCR Step Functions workflow failed — check execution history",
  metric: ocrStateMachine.metricFailed({
    period: Duration.minutes(5),
    statistic: "Sum",
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator:
    cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
ocrFailureAlarm.addAlarmAction(new cwActions.SnsAction(alertsTopic));

export default backend;
