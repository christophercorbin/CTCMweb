import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../functions/post-confirmation/resource";
import { ocrProcessor } from "../functions/ocr-processor/resource";
import { statusNotifier } from "../functions/status-notifier/resource";

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

    // ─── Customer ────────────────────────────────────────────────────
    Customer: a
      .model({
        name: a.string().required(),
        phone: a.string(),
        email: a.string().required(),
        company: a.string(),
        address: a.string(),
        airSkyboxAddress: a.string(),
        seaSkyboxAddress: a.string(),
        cognitoSub: a.string(), // set by post-confirmation trigger
        // Relationships
        shipments: a.hasMany("Shipment", "customerId"),
        invoices: a.hasMany("Invoice", "customerId"),
      })
      .authorization((allow) => [
        allow.owner(),                      // customer self-registered records
        allow.ownerDefinedIn("cognitoSub"), // Lambda-created records (post-confirmation sets cognitoSub)
        allow.group("admin"),
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
        customerId: a.id().required(),
        // Set to the customer's Cognito sub so admin-created shipments
        // are visible to the customer via allow.ownerDefinedIn below
        customerCognitoSub: a.string(),
        // Relationships
        customer: a.belongsTo("Customer", "customerId"),
        packages: a.hasMany("Package", "shipmentId"),
        charges: a.hasMany("ShipmentCharge", "shipmentId"),
        events: a.hasMany("ShipmentEvent", "shipmentId"),
        invoices: a.hasMany("Invoice", "shipmentId"),
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
        // Relationships
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .authorization((allow) => [allow.owner(), allow.group("admin")]),

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
        allow.owner(),
        allow.ownerDefinedIn("customerCognitoSub"),
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
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .secondaryIndexes((index) => [
        index("shipmentId").sortKeys(["eventTimestamp"]), // ordered timeline
      ])
      .authorization((allow) => [allow.owner(), allow.group("admin")]),

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
      })
      .returns(a.customType({ success: a.boolean() }))
      .authorization((allow) => [allow.group("admin")])
      .handler(a.handler.function(statusNotifier)),
  })
  .authorization((allow) => [
    allow.authenticated(),
    allow.resource(postConfirmation),
    allow.resource(ocrProcessor),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
