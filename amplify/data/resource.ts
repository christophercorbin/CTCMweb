import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { ocrProcessor } from "../functions/ocr-processor/resource";
import { statusNotifier } from "../functions/status-notifier/resource";
import { adminCreateCustomer } from "../functions/admin-create-customer/resource";
import { adminDeleteCustomer } from "../functions/admin-delete-customer/resource";
import { syncCustomers } from "../functions/sync-customers/resource";
import { broadcastEmail } from "../functions/broadcast-email/resource";
import { unsubscribe } from "../functions/unsubscribe/resource";
import { sesEvents } from "../functions/ses-events/resource";

const schema = a
  .schema({
    // ─── Enums ───────────────────────────────────────────────────────
    ShipmentStatus: a.enum([
      "PENDING",
      "MIAMI_WAREHOUSE",
      "IN_THE_AIR",
      "IN_BARBADOS",
      "CUSTOMS_HOLD",
      "AT_WAREHOUSE",
      "ON_THE_WATER",
      "IN_BARBADOS_SEA",
      "BARBADOS_CUSTOMS",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELAYED",
      "CANCELLED",
      "RETURNED",
    ]),
    ShipmentType: a.enum(["AIR", "SEA"]),
    PackageType: a.enum(["BOX", "ENVELOPE", "PALLET", "CONTAINER"]),
    ChargeType: a.enum([
      "FREIGHT",
      "CUSTOMS_DUTY",
      "HANDLING",
      "STORAGE",
      "INSURANCE",
      "OTHER",
    ]),
    InvoiceStatus: a.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]),
    ShipmentInstruction: a.enum(["SHIP", "HOLD"]),

    // ─── Customer ────────────────────────────────────────────────────
    Customer: a
      .model({
        name: a.string().required(),
        phone: a.string(),
        email: a.string().required(),
        company: a.string(),
        address: a.string(),
        city: a.string(),
        parish: a.string(),
        country: a.string(),
        airSkyboxAddress: a.string(),
        seaSkyboxAddress: a.string(),
        cognitoSub: a.string(), // set by post-confirmation trigger
        // Cognito IDENTITY id (identity-pool), distinct from cognitoSub.
        // S3 keys are scoped by identity id, so admins need this to write an
        // invoice PDF the customer can actually read. Backfilled on customer login.
        identityId: a.string(),
        // Marketing email preferences — set by unsubscribe link or SES bounce/complaint handler.
        // Broadcasts skip customers with emailOptOut=true; transactional email is unaffected.
        emailOptOut: a.boolean(),
        emailOptOutReason: a.string(), // "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINT"
        // Relationships
        shipments: a.hasMany("Shipment", "customerId"),
        invoices: a.hasMany("Invoice", "customerId"),
      })
      .authorization((allow) => [
        allow.owner(),                                                // customer self-registered records
        allow.ownerDefinedIn("cognitoSub"),                          // post-confirmation Lambda records
        allow.ownerDefinedIn("email").identityClaim("email"),        // admin-created accounts (no cognitoSub)
        allow.group("admin"),
        // syncCustomers Lambda accesses Customer via IAM SigV4 — granted at schema level
        // via allow.resource(syncCustomers) below + grantQuery/grantMutation in backend.ts
      ]),

    // ─── Shipment ────────────────────────────────────────────────────
    Shipment: a
      .model({
        trackingNumber: a.string().required(),
        status: a.ref("ShipmentStatus").required(),
        type: a.ref("ShipmentType").required(),
        origin: a.string(),
        destination: a.string(),
        estimatedDelivery: a.datetime(),
        actualDelivery: a.datetime(),
        description: a.string(),
        warehouseReceiptNumber: a.string(),
        customerId: a.id().required(),
        // Set to the customer's Cognito sub so admin-created shipments
        // are visible to the customer via allow.ownerDefinedIn below
        customerCognitoSub: a.string(),
        // Customer's shipping instruction — set by customer or admin after warehouse notification
        customerInstruction: a.ref("ShipmentInstruction"),
        // Who set the instruction: "CUSTOMER" or "ADMIN"
        instructionSetBy: a.string(),
        // Who created this record: "CUSTOMER" (pre-alert) or "ADMIN" (staff-entered)
        shipmentSource: a.string(),
        // Relationships
        customer: a.belongsTo("Customer", "customerId"),
        packages: a.hasMany("Package", "shipmentId"),
        charges: a.hasMany("ShipmentCharge", "shipmentId"),
        events: a.hasMany("ShipmentEvent", "shipmentId"),
        invoices: a.hasMany("Invoice", "shipmentId"),
        documents: a.hasMany("ShipmentDocument", "shipmentId"),
      })
      .secondaryIndexes((index) => [
        index("trackingNumber"), // access pattern: lookup by tracking #
        index("customerId"), // access pattern: all shipments for a customer
      ])
      .authorization((allow) => [
        allow.owner(),                              // customer-created shipments
        allow.ownerDefinedIn("customerCognitoSub"), // admin-created shipments
        allow.group("admin"),
      ]),

    // ─── Package ─────────────────────────────────────────────────────
    Package: a
      .model({
        shipmentId: a.id().required(),
        packageType: a.ref("PackageType"),
        weight: a.float(),
        weightUnit: a.string().default("kg"),
        length: a.float(),
        width: a.float(),
        height: a.float(),
        dimensionUnit: a.string().default("cm"),
        description: a.string(),
        quantity: a.integer().default(1),
        // OCR-sourced fields
        ocrRawText: a.string(),
        ocrConfidence: a.float(),
        customerCognitoSub: a.string(), // set by admin so customers can read their packages
        // Relationships
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .authorization((allow) => [
        allow.ownerDefinedIn("customerCognitoSub").to(["read"]),
        allow.group("admin"),
      ]),

    // ─── ShipmentCharge ─────────────────────────────────────────────
    ShipmentCharge: a
      .model({
        shipmentId: a.id().required(),
        chargeType: a.ref("ChargeType").required(),
        amount: a.float().required(),
        currency: a.string().default("USD"),
        description: a.string(),
        customerCognitoSub: a.string(),
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .authorization((allow) => [
        allow.ownerDefinedIn("customerCognitoSub").to(["read"]),
        allow.group("admin"),
      ]),

    // ─── ShipmentEvent (timeline) ────────────────────────────────────
    ShipmentEvent: a
      .model({
        shipmentId: a.id().required(),
        status: a.ref("ShipmentStatus").required(),
        location: a.string(),
        description: a.string(),
        eventTimestamp: a.datetime().required(),
        createdBy: a.string(), // Cognito sub of creator (admin)
        customerCognitoSub: a.string(), // set by admin so customers can read their events
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .secondaryIndexes((index) => [
        index("shipmentId").sortKeys(["eventTimestamp"]), // ordered timeline
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("customerCognitoSub").to(["read"]),
        allow.group("admin"),
      ]),

    // ─── ShipmentDocument (customer/admin file attachments) ──────────
    // Replaces the legacy pattern of storing customer order receipts as
    // $0 DRAFT Invoice records (notes='Order receipt').
    ShipmentDocument: a
      .model({
        shipmentId: a.id().required(),
        customerId: a.id(),
        s3Key: a.string().required(),
        fileName: a.string().required(),
        contentType: a.string(),
        sizeBytes: a.integer(),
        // "ORDER_RECEIPT" (customer purchase receipt) — room for future types
        docType: a.string().required(),
        uploadedBy: a.string(), // "CUSTOMER" | "ADMIN"
        customerCognitoSub: a.string(), // so customers can read admin-added docs
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .secondaryIndexes((index) => [index("shipmentId")])
      .authorization((allow) => [
        allow.owner(),                              // customer-uploaded docs
        allow.ownerDefinedIn("customerCognitoSub"), // admin-added docs readable by customer
        allow.group("admin"),
      ]),

    // ─── Invoice ─────────────────────────────────────────────────────
    Invoice: a
      .model({
        customerId: a.id().required(),
        shipmentId: a.id(),
        invoiceNumber: a.string().required(),
        totalAmount: a.float().required(),
        currency: a.string().default("USD"),
        status: a.ref("InvoiceStatus").required(),
        dueDate: a.datetime(),
        paidAt: a.datetime(),
        notes: a.string(),
        s3Key: a.string(), // path to PDF in S3
        customerCognitoSub: a.string(), // admin sets to customer.cognitoSub so customer can read
        trackingNumber: a.string(), // denormalized from Shipment
        // Relationships
        customer: a.belongsTo("Customer", "customerId"),
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .secondaryIndexes((index) => [
        index("customerId"), // invoices by customer
        index("invoiceNumber"), // lookup by invoice number
      ])
      .authorization((allow) => [
        allow.owner(),
        allow.ownerDefinedIn("customerCognitoSub"),
        allow.group("admin"),
      ]),
    // ─── Broadcast (email broadcast history) ─────────────────────────
    Broadcast: a
      .model({
        subject: a.string().required(),
        message: a.string().required(),
        buttonLabel: a.string(),
        buttonUrl: a.string(),
        recipientCount: a.integer(),
        sentCount: a.integer(),
        failedCount: a.integer(),
        // "SENDING" | "SENT" | "SENT_WITH_ERRORS" | "FAILED"
        status: a.string().required(),
        sentBy: a.string(), // admin email
        completedAt: a.datetime(),
      })
      .authorization((allow) => [allow.group("admin")]),

    // ─── Custom mutation: send status notification email ─────────────
    sendStatusNotification: a
      .mutation()
      .arguments({
        shipmentId: a.id().required(),
        customerEmail: a.string().required(),
        customerName: a.string(),
        trackingNumber: a.string().required(),
        status: a.string().required(),
        customMessage: a.string(),
        // "STATUS_UPDATE" (default) | "ADMIN_SHIP" | "ADMIN_HOLD"
        notificationType: a.string(),
      })
      .returns(a.customType({ success: a.boolean() }))
      .authorization((allow) => [allow.group("admin")])
      .handler(a.handler.function(statusNotifier)),
    // ─── Custom mutation: admin creates customer account + sends welcome email ─
    createCustomerWithAccount: a
      .mutation()
      .arguments({
        name: a.string().required(),
        email: a.string().required(),
        phone: a.string(),
        company: a.string(),
        address: a.string(),
        city: a.string(),
        parish: a.string(),
        country: a.string(),
        airSkyboxAddress: a.string(),
        seaSkyboxAddress: a.string(),
      })
      .returns(
        a.customType({
          success: a.boolean(),
          customerId: a.string(),
          message: a.string(),
        })
      )
      .authorization((allow) => [allow.group("admin")])
      .handler(a.handler.function(adminCreateCustomer)),
    // ─── Custom mutation: admin deletes Cognito user + Customer record ─────────
    deleteCustomerWithAccount: a
      .mutation()
      .arguments({
        customerId: a.string().required(),
      })
      .returns(
        a.customType({
          success: a.boolean(),
          message: a.string(),
        })
      )
      .authorization((allow) => [allow.group("admin")])
      .handler(a.handler.function(adminDeleteCustomer)),
    // ─── Custom mutation: sync missing Customer records from Cognito ──────────
    // Also (optionally) refresh stored skybox addresses on all existing records
    // by passing `refreshAddresses: true`.
    syncCustomersFromCognito: a
      .mutation()
      .arguments({
        refreshAddresses: a.boolean(),
      })
      .returns(
        a.customType({
          synced: a.integer(),
          skipped: a.integer(),
          errors: a.integer(),
          refreshed: a.integer(),
        })
      )
      .authorization((allow) => [allow.group("admin")])
      .handler(a.handler.function(syncCustomers)),
    // ─── Custom mutation: admin broadcasts a branded email to customers ────────
    // Omit customerIds to send to ALL customers. Pass testEmail to send a
    // single [TEST] email to that address instead of broadcasting.
    // Sending is asynchronous: the mutation validates, creates a Broadcast
    // history record, kicks off background sending, and returns immediately.
    // Customers with emailOptOut=true are skipped automatically.
    sendBroadcastEmail: a
      .mutation()
      .arguments({
        subject: a.string().required(),
        message: a.string().required(),
        buttonLabel: a.string(),
        buttonUrl: a.string(),
        customerIds: a.string().array(),
        testEmail: a.string(),
        sentBy: a.string(), // admin email, recorded on the Broadcast record
      })
      .returns(
        a.customType({
          success: a.boolean(),
          recipientCount: a.integer(),
          broadcastId: a.string(),
          message: a.string(),
        })
      )
      .authorization((allow) => [allow.group("admin")])
      .handler(a.handler.function(broadcastEmail)),
  })
  .authorization((allow) => [
    allow.authenticated(),
    allow.resource(ocrProcessor),
    allow.resource(syncCustomers),
    allow.resource(adminCreateCustomer),
    allow.resource(adminDeleteCustomer),
    allow.resource(broadcastEmail),
    allow.resource(unsubscribe),
    allow.resource(sesEvents),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
