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

// ─── Step Functions: OCR State Machine ───────────────────────────────────────
const ocrProcessorFn = backend.ocrProcessor.resources.lambda as lambda.Function;
// Use the data stack to avoid circular dependencies (ocrProcessor is in data stack)
const stack = (backend.ocrProcessor.resources.lambda as lambda.Function).stack;

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
  tracingEnabled: true,
  timeout: Duration.minutes(10), // prevent runaway executions
});

// Give ocr-trigger Lambda permission to start state machine
const ocrTriggerLambda = backend.ocrTrigger.resources.lambda as lambda.IFunction;
ocrStateMachine.grantStartExecution(ocrTriggerLambda);
(ocrTriggerLambda as lambda.Function).addEnvironment(
  "STATE_MACHINE_ARN",
  ocrStateMachine.stateMachineArn
);

// Give ocr-processor Lambda Textract permissions
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
const storageBucket = backend.storage.resources.bucket;
const ocrTriggerLambdaForS3 = backend.ocrTrigger.resources.lambda as lambda.IFunction;
storageBucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(ocrTriggerLambdaForS3),
  { prefix: "receipts/" }
);

export default backend;
