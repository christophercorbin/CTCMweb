import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { ocrTrigger } from "./functions/ocr-trigger/resource";
import { ocrProcessor } from "./functions/ocr-processor/resource";
import { postConfirmation } from "./functions/post-confirmation/resource";
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
});

// ─── Inject AppSync endpoint into postConfirmation and ocrProcessor ──────────
backend.postConfirmation.resources.lambda.addEnvironment(
  "GRAPHQL_API_ENDPOINT",
  backend.data.resources.graphqlApi.graphqlUrl
);
backend.ocrProcessor.resources.lambda.addEnvironment(
  "GRAPHQL_API_ENDPOINT",
  backend.data.resources.graphqlApi.graphqlUrl
);

// ─── Grant post-confirmation Lambda Cognito + AppSync permissions ─────────────
backend.postConfirmation.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminUpdateUserAttributes",
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
backend.data.resources.graphqlApi.grantMutation(
  backend.postConfirmation.resources.lambda
);

// ─── Step Functions: OCR State Machine ───────────────────────────────────────
const ocrProcessorFn = backend.ocrProcessor.resources.lambda as lambda.Function;
const stack = backend.ocrTrigger.resources.lambda.stack;

const startTextract = new tasks.LambdaInvoke(stack, "StartTextractJob", {
  lambdaFunction: ocrProcessorFn,
  payload: sfn.TaskInput.fromObject({
    action: "START",
    "s3Key.$": "$.s3Key",
    "s3Bucket.$": "$.s3Bucket",
  }),
  resultPath: "$.textractJob",
});

const waitForTextract = new sfn.Wait(stack, "WaitForTextract", {
  time: sfn.WaitTime.duration(Duration.seconds(15)),
});

const checkTextract = new tasks.LambdaInvoke(stack, "CheckTextractJob", {
  lambdaFunction: ocrProcessorFn,
  payload: sfn.TaskInput.fromObject({
    action: "CHECK",
    "jobId.$": "$.textractJob.Payload.jobId",
    "s3Key.$": "$.s3Key",
  }),
  resultPath: "$.textractResult",
});

const jobComplete = new sfn.Choice(stack, "IsJobComplete");

const persistResults = new tasks.LambdaInvoke(stack, "PersistOCRResults", {
  lambdaFunction: ocrProcessorFn,
  payload: sfn.TaskInput.fromObject({
    action: "PERSIST",
    "blocks.$": "$.textractResult.Payload.blocks",
    "s3Key.$": "$.s3Key",
    "uploadedBy.$": "$.uploadedBy",
  }),
});

const ocrFailed = new sfn.Fail(stack, "OCRFailed", {
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
      .otherwise(waitForTextract) // loop back if still IN_PROGRESS
  );

const ocrStateMachine = new sfn.StateMachine(stack, "OCRStateMachine", {
  definitionBody: sfn.DefinitionBody.fromChainable(definition),
  stateMachineName: `ctcm-ocr-${stack.stackName}`,
  tracingEnabled: true,
  timeout: Duration.minutes(10), // prevent runaway executions
});

// Give ocr-trigger Lambda permission to start state machine
ocrStateMachine.grantStartExecution(backend.ocrTrigger.resources.lambda);
backend.ocrTrigger.resources.lambda.addEnvironment(
  "STATE_MACHINE_ARN",
  ocrStateMachine.stateMachineArn
);

// Give ocr-processor Lambda Textract + AppSync permissions
ocrProcessorFn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "textract:StartDocumentTextDetection",
      "textract:GetDocumentTextDetection",
    ],
    resources: ["*"],
  })
);
backend.data.resources.graphqlApi.grantMutation(ocrProcessorFn);

// ─── S3 → ocr-trigger notification ───────────────────────────────────────────
const storageBucket = backend.storage.resources.bucket;
storageBucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(backend.ocrTrigger.resources.lambda),
  { prefix: "receipts/" }
);

export default backend;
