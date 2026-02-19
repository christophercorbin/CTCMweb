import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../functions/post-confirmation/resource";
import { ocrProcessor } from "../functions/ocr-processor/resource";

const schema = a
  .schema({
    // ─── Enums ───────────────────────────────────────────────────────
    ShipmentStatus: a.enum([
      "PENDING",
      "IN_TRANSIT",
      "CUSTOMS",
      "DELIVERED",
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
        allow.owner(), // customer sees own record
        allow.group("admin"), // admin full CRUD
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
      .authorization((allow) => [allow.owner(), allow.group("admin")]),

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
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .authorization((allow) => [allow.owner(), allow.group("admin")]),

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
        // Relationships
        customer: a.belongsTo("Customer", "customerId"),
        shipment: a.belongsTo("Shipment", "shipmentId"),
      })
      .secondaryIndexes((index) => [
        index("customerId"), // invoices by customer
        index("invoiceNumber"), // lookup by invoice number
      ])
      .authorization((allow) => [allow.owner(), allow.group("admin")]),
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
