import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { ocrTrigger } from "./functions/ocr-trigger/resource";
import { ocrProcessor } from "./functions/ocr-processor/resource";
import { postConfirmation } from "./functions/post-confirmation/resource";
import { statusNotifier } from "./functions/status-notifier/resource";
import { adminCreateCustomer } from "./functions/admin-create-customer/resource";
import { syncCustomers } from "./functions/sync-customers/resource";
import * as iam from "aws-cdk-lib/aws-iam";
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
  syncCustomers,
});

// ─── Cognito App Client: enable USER_PASSWORD_AUTH ───────────────────────────
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;
cfnUserPoolClient.explicitAuthFlows = [
  "ALLOW_USER_SRP_AUTH",
  "ALLOW_USER_PASSWORD_AUTH",
  "ALLOW_REFRESH_TOKEN_AUTH",
];

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
    "uploadedBy.$": "$.uploadedBy",
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
statusNotifierFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  })
);

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
    ],
    resources: ["*"],
  })
);

adminCreateCustomerFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  })
);

// USER_POOL_ID is NOT set here to avoid a CDK cross-stack cycle (data → auth).
// Instead, set USER_POOL_ID as a branch-specific environment variable in the
// Amplify Console (App settings → Environment variables). Each branch (develop,
// main) must have its own value pointing to its own Cognito User Pool.
adminCreateCustomerFn.addEnvironment(
  "GRAPHQL_API_ENDPOINT",
  (backend.data.resources.graphqlApi as any).graphqlUrl
);

// Grant Lambda permission to call AppSync mutations (createCustomer)
backend.data.resources.graphqlApi.grantMutation(adminCreateCustomerFn);

// ─── syncCustomers: Cognito list + AppSync read/write permissions ─────────────
const syncCustomersFn = backend.syncCustomers.resources.lambda as lambda.Function;

// NOTE: Use resources: ["*"] to avoid a CDK cross-stack cycle (data → auth).
// USER_POOL_ID is set as a branch-specific env var in the Amplify Console — not here.
syncCustomersFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["cognito-idp:ListUsersInGroup"],
    resources: ["*"],
  })
);

syncCustomersFn.addEnvironment(
  "GRAPHQL_API_ENDPOINT",
  (backend.data.resources.graphqlApi as any).graphqlUrl
);

// grantQuery for listCustomers + grantMutation for createCustomer
backend.data.resources.graphqlApi.grantQuery(syncCustomersFn);
backend.data.resources.graphqlApi.grantMutation(syncCustomersFn);

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
    resources: ["*"],
  })
);

// Admin notification email — change ADMIN_NOTIFY_EMAIL to your preferred inbox
postConfirmationFn.addEnvironment("SENDER_EMAIL",       "notifications@ctcm.bb");
postConfirmationFn.addEnvironment("ADMIN_NOTIFY_EMAIL", "christophercorbin24@gmail.com");

// IMPORTANT: Cannot use CDK tokens from data stack here because data already
// depends on auth (UserPool) — any auth→data reference creates a cycle.
// The postConfirmation Lambda resolves the endpoint at runtime by calling
// AppSync DescribeGraphqlApi or reading from SSM. We grant broad appsync:*
// and ssm:GetParameter permissions, and the Lambda handler falls back to
// looking up the endpoint dynamically if AMPLIFY_DATA_GRAPHQL_ENDPOINT is unset.

export default backend;
