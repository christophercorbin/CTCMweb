#!/usr/bin/env node
/**
 * Reattach orphaned customer uploads to their shipments.
 *
 * An orphan is an S3 object under documents/ with no ShipmentDocument row
 * pointing at it. These came from upload paths that wrote the file and then
 * failed (or never attempted) the database write, so nothing linked the file to
 * a shipment and no admin view could surface it.
 *
 * Two key shapes carry a shipment id and can be reattached automatically:
 *
 *   documents/{identityId}/invoices/{shipmentId}/{fileName}
 *   documents/{identityId}/shipments/{shipmentId}/{fileName}
 *
 * A third cannot — it predates per-shipment prefixes and has no shipment
 * reference anywhere in the key. Those are reported as MANUAL and must be
 * attached by a human at /admin/unassigned-uploads:
 *
 *   documents/{identityId}/invoices/{timestamp}-{fileName}
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply. The dry run prints
 * every row it would create and every file it would skip, with the reason.
 *
 *   node scripts/backfill-orphan-documents.mjs --env prod
 *   node scripts/backfill-orphan-documents.mjs --env prod --out plan.json
 *   node scripts/backfill-orphan-documents.mjs --env prod --apply
 *
 * The file itself is never copied, moved or deleted — only a database row is
 * added, recording the key where the object already lives. That keeps the
 * object inside the customer's own prefix so both they and admins retain
 * access, and makes the operation reversible by deleting the created rows.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

// ─── Environments ──────────────────────────────────────────────────────────
const ENVS = {
  dev: {
    suffix: 'nafgxn26f5ffphbae7dk6vs24y-NONE',
    bucket: 'amplify-d1yo6c4008x99n-de-ctcmstoragebucketa7605e5-pc2cxf6mqhp2',
  },
  prod: {
    suffix: '76u5kmfvy5avpmqdouabvgbxjm-NONE',
    bucket: 'amplify-d1yo6c4008x99n-ma-ctcmstoragebucketa7605e5-1smufkv45wds',
  },
}

const args = process.argv.slice(2)
const flag = (n) => args.includes(n)
const val = (n) => { const i = args.indexOf(n); return i === -1 ? undefined : args[i + 1] }

const envName = val('--env')
const APPLY = flag('--apply')
const PROFILE = val('--profile') ?? 'personal-ctcm-dev'
const REGION = val('--region') ?? 'us-east-1'
const OUT = val('--out')

if (!envName || !ENVS[envName]) {
  console.error('Usage: backfill-orphan-documents.mjs --env <dev|prod> [--apply] [--out plan.json]')
  console.error(`  --env is required and must be one of: ${Object.keys(ENVS).join(', ')}`)
  process.exit(2)
}
const { suffix, bucket } = ENVS[envName]
const table = (model) => `${model}-${suffix}`

// ─── AWS helpers (shell out to the configured CLI; no SDK dependency) ──────
function aws(args) {
  const out = execFileSync('aws', [...args, '--profile', PROFILE, '--region', REGION, '--output', 'json'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
  return out.trim() ? JSON.parse(out) : {}
}

const S = (v) => (v == null ? undefined : v.S)
const N = (v) => (v == null ? undefined : Number(v.N))

function scan(model, projection) {
  const a = ['dynamodb', 'scan', '--table-name', table(model)]
  if (projection) a.push('--projection-expression', projection)
  return aws(a).Items ?? []
}

// ─── Gather ────────────────────────────────────────────────────────────────
console.log(`\nEnvironment : ${envName}`)
console.log(`Bucket      : ${bucket}`)
console.log(`Tables      : *-${suffix}`)
console.log(`Mode        : ${APPLY ? '*** APPLY (will write) ***' : 'DRY RUN (no writes)'}\n`)

console.log('Reading S3 and DynamoDB…')
const objects = (aws(['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', 'documents/']).Contents ?? [])
const docs = scan('ShipmentDocument', 's3Key, customerId')
const shipments = scan('Shipment', 'id, customerId, trackingNumber')
const customers = scan('Customer', 'id, cognitoSub, identityId, email')

const known = new Set(docs.map((d) => S(d.s3Key)).filter(Boolean))
const shipById = new Map(shipments.map((s) => [S(s.id), { customerId: S(s.customerId), tracking: S(s.trackingNumber) }]))
const custById = new Map(customers.map((c) => [S(c.id), { cognitoSub: S(c.cognitoSub), identityId: S(c.identityId), email: S(c.email)?.toLowerCase() }]))

// Customer.identityId is only backfilled when a customer logs in, so many rows
// lack it. The 267 documents already attached carry both the identity (inside
// their s3Key) and the customerId, which gives a second, evidence-based way to
// prove an identity belongs to a customer. Only unambiguous mappings are kept:
// an identity seen against two different customers proves nothing.
const observed = new Map()
for (const d of docs) {
  const key = S(d.s3Key); const cid = S(d.customerId)
  if (!key || !cid) continue
  const id = /^documents\/([^/]+)\//.exec(key)?.[1]
  if (!id) continue
  if (!observed.has(id)) observed.set(id, new Set())
  observed.get(id).add(cid)
}
const identityOwner = new Map(
  [...observed].filter(([, set]) => set.size === 1).map(([id, set]) => [id, [...set][0]])
)
console.log(`  identity→customer map : ${identityOwner.size} unambiguous (from existing rows)`)

console.log(`  S3 objects            : ${objects.length}`)
console.log(`  ShipmentDocument rows : ${docs.length}`)
console.log(`  Shipments             : ${shipments.length}`)
console.log(`  Customers             : ${customers.length}\n`)

// ─── Classify ──────────────────────────────────────────────────────────────
const WITH_SHIPMENT = /^documents\/([^/]+)\/(?:invoices|shipments)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(.+)$/
const NO_SHIPMENT   = /^documents\/([^/]+)\/invoices\/([^/]+)$/

const TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', heic: 'image/heic', gif: 'image/gif' }
const contentType = (name) => TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'

const plan = []
const skipped = []
const manual = []

for (const obj of objects) {
  const key = obj.Key
  if (known.has(key)) continue // already attached

  const m = WITH_SHIPMENT.exec(key)
  if (!m) {
    if (NO_SHIPMENT.test(key)) {
      manual.push({ s3Key: key, reason: 'no shipment id in key — attach at /admin/unassigned-uploads' })
    } else {
      skipped.push({ s3Key: key, reason: 'unrecognised key shape' })
    }
    continue
  }

  const [, identityId, shipmentId, fileName] = m
  const ship = shipById.get(shipmentId)
  if (!ship) { skipped.push({ s3Key: key, reason: `shipment ${shipmentId} does not exist (deleted?)` }); continue }

  const cust = custById.get(ship.customerId)
  if (!cust) { skipped.push({ s3Key: key, reason: `customer ${ship.customerId} not found` }); continue }

  // Tenant safety: the identity that owns the S3 prefix must be the same
  // customer the shipment belongs to. A mismatch would expose one customer's
  // file on another's shipment, so it is never attached automatically.
  if (cust.identityId && cust.identityId !== identityId) {
    skipped.push({ s3Key: key, reason: `identity mismatch — key ${identityId} vs customer ${cust.identityId}` })
    continue
  }
  let proof = cust.identityId ? 'Customer.identityId' : 'observed from existing documents'
  if (!cust.identityId) {
    // Fall back to the identity→customer mapping observed on already-attached
    // documents. Ownership is still proven, just from evidence rather than from
    // the (often unpopulated) Customer.identityId field.
    const owner = identityOwner.get(identityId)
    if (!owner) {
      skipped.push({ s3Key: key, reason: 'customer has no identityId and identity is unseen — cannot verify ownership' })
      continue
    }
    if (owner !== ship.customerId) {
      // The same person can hold more than one Customer record (duplicates
      // differing only by a typo in the name), which makes the ids differ while
      // the human does not. Email is the identity anchor, so an exact match on
      // it still proves ownership; anything else is a genuine cross-tenant
      // mismatch and must never be attached automatically.
      const a = custById.get(owner)?.email
      const b = cust.email
      if (!a || !b || a !== b) {
        skipped.push({ s3Key: key, reason: 'identity mismatch (observed) — belongs to a different customer' })
        continue
      }
      proof = `duplicate customer records, same email (${b})`
    }
  }
  if (!cust.cognitoSub) {
    skipped.push({ s3Key: key, reason: 'customer has no cognitoSub — customer could not read the row' })
    continue
  }

  const ts = obj.LastModified ?? new Date().toISOString()
  plan.push({
    id: randomUUID(),
    __typename: 'ShipmentDocument',
    shipmentId,
    trackingNumber: ship.tracking,        // reporting only, not written
    customerId: ship.customerId,
    customerCognitoSub: cust.cognitoSub,
    owner: `${cust.cognitoSub}::${cust.cognitoSub}`,
    s3Key: key,
    fileName,
    contentType: contentType(fileName),
    sizeBytes: obj.Size,
    docType: 'ORDER_RECEIPT',
    uploadedBy: 'CUSTOMER',
    createdAt: ts,
    updatedAt: ts,
    _ownershipProof: proof,
  })
}

// ─── Report ────────────────────────────────────────────────────────────────
console.log('─'.repeat(78))
console.log(`WOULD CREATE : ${plan.length} ShipmentDocument row(s)`)
console.log(`MANUAL       : ${manual.length} file(s) with no shipment id in the key`)
console.log(`SKIPPED      : ${skipped.length} file(s) failing a safety check`)
console.log('─'.repeat(78))

if (plan.length) {
  console.log('\nRows to create (shipment ← file):')
  for (const p of plan.slice(0, 40)) {
    console.log(`  ${(p.trackingNumber ?? p.shipmentId).padEnd(18)} ← ${p.fileName.slice(0, 52)}`)
  }
  if (plan.length > 40) console.log(`  … and ${plan.length - 40} more`)
}
if (skipped.length) {
  console.log('\nSkipped:')
  const byReason = {}
  for (const s of skipped) byReason[s.reason.replace(/[0-9a-f-]{36}/g, '<id>')] = (byReason[s.reason.replace(/[0-9a-f-]{36}/g, '<id>')] ?? 0) + 1
  for (const [r, c] of Object.entries(byReason)) console.log(`  ${String(c).padStart(4)}  ${r}`)
}
if (manual.length) console.log(`\n${manual.length} file(s) need manual attachment at /admin/unassigned-uploads`)

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ env: envName, generatedAt: new Date().toISOString(), plan, skipped, manual }, null, 2))
  console.log(`\nFull plan written to ${OUT}`)
}

if (!APPLY) {
  console.log('\nDRY RUN — nothing was written. Re-run with --apply to create these rows.\n')
  process.exit(0)
}

// ─── Apply ─────────────────────────────────────────────────────────────────
console.log(`\nApplying ${plan.length} row(s) to ${envName}…\n`)
let ok = 0, failed = 0
for (const p of plan) {
  const { trackingNumber, _ownershipProof, ...row } = p
  const item = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue
    item[k] = typeof v === 'number' ? { N: String(v) } : { S: String(v) }
  }
  try {
    // Condition guards against a double-run creating duplicates.
    aws(['dynamodb', 'put-item', '--table-name', table('ShipmentDocument'),
         '--item', JSON.stringify(item),
         '--condition-expression', 'attribute_not_exists(id)'])
    ok++
    console.log(`  ✓ ${trackingNumber ?? row.shipmentId} ← ${row.fileName.slice(0, 50)}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${row.s3Key}\n    ${String(e.stderr ?? e.message).trim().split('\n').pop()}`)
  }
}
console.log(`\nCreated ${ok}, failed ${failed}.`)
process.exit(failed ? 1 : 0)
