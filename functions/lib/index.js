"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchOrganization = exports.acceptInvitation = exports.validateInvitation = exports.revokeInvitation = exports.remindPendingInvitations = exports.resendInvitation = exports.createInvitation = exports.createBusinessProfile = exports.hello = exports.generateReportPdf = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const PDFDocument = require("pdfkit");
const crypto_1 = require("crypto");
const sgMail = require("@sendgrid/mail");
admin.initializeApp();
function requireAuth(request) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    return uid;
}
function isFiniteNumber(x) {
    return typeof x === 'number' && Number.isFinite(x);
}
function toBuffer(doc) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', (d) => {
            chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d));
        });
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
}
async function maybeDownload(bucket, path) {
    try {
        const [b] = await bucket.file(path).download();
        return b;
    }
    catch {
        return null;
    }
}
function sectionForFinding(f) {
    const raw = String(f.category || f.section || f.roomArea || '').toLowerCase();
    const exterior = ['exterior', 'roof', 'foundation', 'structure', 'site', 'drainage', 'grading', 'siding', 'deck', 'porch', 'garage'];
    const interior = ['interior', 'kitchen', 'bath', 'bed', 'living', 'attic', 'doors', 'windows', 'floors', 'walls', 'ceiling'];
    const systems = ['systems', 'electrical', 'plumbing', 'hvac', 'appliances', 'safety', 'smoke', 'water heater', 'heater', 'ac'];
    if (exterior.some(x => raw.includes(x)))
        return 'Exterior';
    if (interior.some(x => raw.includes(x)))
        return 'Interior';
    if (systems.some(x => raw.includes(x)))
        return 'Systems';
    return 'Systems';
}
function sevColor(sev) {
    if (sev === 'critical')
        return '#ef4444';
    if (sev === 'high')
        return '#f97316';
    if (sev === 'medium')
        return '#eab308';
    return '#22c55e';
}
/**
 * PDFKit does not provide doc.page.number.
 * Maintain our own counter.
 */
function addHeaderFooter(doc, ctx) {
    let pageNo = 1;
    const draw = () => {
        const { width, height } = doc.page;
        doc.save();
        doc.fontSize(9).fillColor('#64748b');
        doc.text(ctx.title, 50, 20, { width: width - 100, align: 'left' });
        if (ctx.subtitle) {
            doc.text(ctx.subtitle, 50, 32, { width: width - 100, align: 'left' });
        }
        doc.text(`Page ${pageNo}`, 50, height - 30, { width: width - 100, align: 'right' });
        doc.restore();
        doc.moveTo(50, 48)
            .lineTo(width - 50, 48)
            .strokeColor('#1f2937')
            .opacity(0.4)
            .stroke()
            .opacity(1);
    };
    draw();
    doc.on('pageAdded', () => {
        pageNo += 1;
        draw();
    });
}
function coverPage(doc, opts) {
    const w = doc.page.width;
    doc.save();
    doc.rect(0, 0, w, 110).fill('#0b1220');
    doc.restore();
    if (opts.logo) {
        try {
            doc.image(opts.logo, 50, 30, { fit: [120, 60] });
        }
        catch { }
    }
    doc.fillColor('#e5e7eb');
    doc.fontSize(20).text('Home Inspection Report', 200, 38, { align: 'left' });
    doc.fontSize(10).fillColor('#94a3b8').text(`Org: ${opts.orgId}`, 200, 66, { align: 'left' });
    const insp = opts.inspection;
    doc.moveDown(5);
    doc.fillColor('#0f172a');
    doc.fontSize(12).text('Report Details', 50, 140);
    doc.moveTo(50, 158).lineTo(w - 50, 158).strokeColor('#e5e7eb').opacity(0.4).stroke().opacity(1);
    doc.fillColor('#111827');
    doc.fontSize(11);
    doc.text(`Generated: ${new Date(opts.generatedAt).toLocaleString()}`, 50, 175);
    if (insp) {
        doc.text(`Inspection ID: ${insp.id}`, 50, 195);
        doc.text(`Property ID: ${insp.propertyId ?? '-'}`, 50, 215);
        doc.text(`Status: ${insp.status ?? '-'}`, 50, 235);
        if (insp.scheduledAt)
            doc.text(`Scheduled: ${new Date(insp.scheduledAt).toLocaleString()}`, 50, 255);
    }
    doc.addPage();
}
function sectionDivider(doc, title) {
    doc.save();
    doc.rect(0, 0, doc.page.width, 70).fill('#0b1220');
    doc.restore();
    doc.fillColor('#e5e7eb').fontSize(18).text(title, 50, 26);
    doc.moveDown(2);
}
async function renderFinding(doc, bucket, f, includePhotos) {
    const sev = String(f.severity || 'medium');
    const color = sevColor(sev);
    doc.save();
    doc.roundedRect(50, doc.y, doc.page.width - 100, 20, 6).fillOpacity(0.15).fill(color).fillOpacity(1);
    doc.fillColor('#e5e7eb').fontSize(10).text(sev.toUpperCase(), 60, doc.y + 5);
    doc.restore();
    doc.moveDown(1.2);
    doc.fillColor('#0f172a').fontSize(12).text(f.summary || '-', { continued: false });
    doc.fillColor('#475569').fontSize(10).text(`Room/Area: ${f.roomArea || '-'}   •   Inspection: ${String(f.inspectionId || '').slice(0, 10)}`);
    if (f.details) {
        doc.moveDown(0.3);
        doc.fillColor('#111827').fontSize(10).text(String(f.details));
    }
    if (includePhotos && Array.isArray(f.photos) && f.photos.length) {
        const photos = f.photos.slice(0, 4);
        doc.moveDown(0.5);
        const startY = doc.y;
        const boxW = (doc.page.width - 100 - 10) / 2;
        const boxH = 150;
        let x = 50;
        let y = startY;
        for (let i = 0; i < photos.length; i++) {
            const p = photos[i];
            const buf = p?.path ? await maybeDownload(bucket, String(p.path)) : null;
            doc.save();
            doc.roundedRect(x, y, boxW, boxH, 10).strokeColor('#e5e7eb').opacity(0.25).stroke().opacity(1);
            doc.restore();
            if (buf) {
                try {
                    doc.image(buf, x + 8, y + 8, { fit: [boxW - 16, boxH - 28] });
                }
                catch { }
            }
            else {
                doc.fillColor('#94a3b8').fontSize(9).text('Photo unavailable', x + 10, y + 60);
            }
            const label = String(p?.name || '').slice(0, 42) || `Photo ${i + 1}`;
            doc.fillColor('#94a3b8').fontSize(8).text(label, x + 10, y + boxH - 16, { width: boxW - 20 });
            if (i % 2 === 0) {
                x = 50 + boxW + 10;
            }
            else {
                x = 50;
                y += boxH + 10;
            }
        }
        doc.y = y + boxH + 4;
    }
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').opacity(0.2).stroke().opacity(1);
    doc.moveDown(0.8);
}
async function renderSignatures(doc, bucket, inspection) {
    const sigI = inspection?.signatureInspector?.path
        ? await maybeDownload(bucket, String(inspection.signatureInspector.path))
        : null;
    const sigC = inspection?.signatureClient?.path
        ? await maybeDownload(bucket, String(inspection.signatureClient.path))
        : null;
    doc.fontSize(14).fillColor('#0f172a').text('Signatures', { underline: true });
    doc.moveDown(0.6);
    const block = async (title, buf) => {
        doc.fontSize(11).fillColor('#111827').text(title);
        doc.save();
        doc.roundedRect(50, doc.y + 6, doc.page.width - 100, 110, 10).strokeColor('#e5e7eb').opacity(0.35).stroke().opacity(1);
        doc.restore();
        if (buf) {
            try {
                doc.image(buf, 60, doc.y + 16, { fit: [doc.page.width - 120, 80] });
            }
            catch { }
        }
        else {
            doc.fillColor('#94a3b8').fontSize(10).text('Not provided', 60, doc.y + 55);
        }
        doc.moveDown(8);
    };
    await block('Inspector Signature', sigI);
    await block('Client Signature', sigC);
}
/**
 * v2 callable
 */
exports.generateReportPdf = (0, https_1.onCall)(async (request) => {
    const uid = requireAuth(request);
    const data = request.data || {};
    const orgId = String(data.orgId || '').trim();
    if (!orgId) {
        throw new https_1.HttpsError('invalid-argument', 'orgId is required.');
    }
    const from = isFiniteNumber(data.from) ? Number(data.from) : undefined;
    const to = isFiniteNumber(data.to) ? Number(data.to) : undefined;
    const inspectionId = String(data.inspectionId || '').trim() || undefined;
    const include = {
        inspections: !!data.include?.inspections,
        findings: !!data.include?.findings,
        workOrders: !!data.include?.workOrders,
        photos: !!data.include?.photos,
        signatures: !!data.include?.signatures,
        branding: !!data.include?.branding,
    };
    const reportRef = admin.firestore().collection(`orgs/${orgId}/reports`).doc();
    const reportId = reportRef.id;
    const now = Date.now();
    await reportRef.set({
        orgId,
        requestedBy: uid,
        from: from ?? null,
        to: to ?? null,
        inspectionId: inspectionId ?? null,
        include,
        status: 'processing',
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    try {
        const db = admin.firestore();
        const bucket = admin.storage().bucket();
        const counts = {};
        const logoPath = `orgs/${orgId}/branding/logo.png`;
        const logoBuf = include.branding ? await maybeDownload(bucket, logoPath) : null;
        let inspection = null;
        if (inspectionId) {
            const inspSnap = await db.doc(`orgs/${orgId}/inspections/${inspectionId}`).get();
            if (!inspSnap.exists)
                throw new Error('Inspection not found for provided inspectionId');
            inspection = { id: inspSnap.id, ...inspSnap.data() };
        }
        const inspections = [];
        const findings = [];
        const workOrders = [];
        if (inspectionId) {
            inspections.push(inspection);
            counts.inspections = 1;
            if (include.findings) {
                const snap = await db
                    .collection(`orgs/${orgId}/findings`)
                    .where('inspectionId', '==', inspectionId)
                    .orderBy('createdAt', 'desc')
                    .limit(200)
                    .get();
                snap.forEach(d => findings.push({ id: d.id, ...d.data() }));
                counts.findings = findings.length;
            }
            if (include.workOrders) {
                const snap = await db
                    .collection(`orgs/${orgId}/workOrders`)
                    .where('inspectionId', '==', inspectionId)
                    .orderBy('createdAt', 'desc')
                    .limit(200)
                    .get();
                snap.forEach(d => workOrders.push({ id: d.id, ...d.data() }));
                counts.workOrders = workOrders.length;
            }
        }
        else {
            if (include.inspections) {
                let q = db.collection(`orgs/${orgId}/inspections`);
                if (from)
                    q = q.where('updatedAt', '>=', from);
                if (to)
                    q = q.where('updatedAt', '<=', to);
                const snap = await q.orderBy('updatedAt', 'desc').limit(50).get();
                snap.forEach(d => inspections.push({ id: d.id, ...d.data() }));
                counts.inspections = inspections.length;
            }
            if (include.findings) {
                let q = db.collection(`orgs/${orgId}/findings`);
                if (from)
                    q = q.where('createdAt', '>=', from);
                if (to)
                    q = q.where('createdAt', '<=', to);
                const snap = await q.orderBy('createdAt', 'desc').limit(50).get();
                snap.forEach(d => findings.push({ id: d.id, ...d.data() }));
                counts.findings = findings.length;
            }
            if (include.workOrders) {
                let q = db.collection(`orgs/${orgId}/workOrders`);
                if (from)
                    q = q.where('createdAt', '>=', from);
                if (to)
                    q = q.where('createdAt', '<=', to);
                const snap = await q.orderBy('createdAt', 'desc').limit(50).get();
                snap.forEach(d => workOrders.push({ id: d.id, ...d.data() }));
                counts.workOrders = workOrders.length;
            }
        }
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
        const headerTitle = inspectionId ? 'Home Inspection Report' : 'Home Inspection Report (Summary)';
        const subtitle = inspectionId
            ? `Inspection ${inspectionId.slice(0, 10)} • Property ${inspection?.propertyId ?? '-'}`
            : `Org ${orgId}`;
        addHeaderFooter(doc, { title: headerTitle, subtitle });
        if (include.branding) {
            coverPage(doc, { logo: logoBuf, orgId, inspection, generatedAt: now });
        }
        else {
            doc.fontSize(18).text(headerTitle);
            doc.fontSize(10).fillColor('#666').text(subtitle);
            doc.moveDown(1);
        }
        doc.fontSize(12).fillColor('#0f172a').text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#111827').text(`Inspections: ${counts.inspections ?? 0}`);
        doc.text(`Findings: ${counts.findings ?? 0}`);
        doc.text(`Work Orders: ${counts.workOrders ?? 0}`);
        doc.moveDown(1);
        if (inspectionId && include.findings && include.branding) {
            const bySection = { Exterior: [], Interior: [], Systems: [] };
            for (const f of findings)
                bySection[sectionForFinding(f)].push(f);
            for (const sec of ['Exterior', 'Interior', 'Systems']) {
                sectionDivider(doc, sec.toUpperCase());
                const list = bySection[sec];
                if (!list.length) {
                    doc.fillColor('#64748b').fontSize(11).text('No findings recorded in this section.');
                    doc.addPage();
                    continue;
                }
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                list.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
                for (const f of list) {
                    if (doc.y > doc.page.height - 240)
                        doc.addPage();
                    await renderFinding(doc, bucket, f, include.photos);
                }
                doc.addPage();
            }
            if (include.workOrders && workOrders.length) {
                sectionDivider(doc, 'WORK ORDERS');
                doc.fontSize(11).fillColor('#111827');
                workOrders.forEach((x, i) => {
                    doc.text(`${i + 1}. ${x.summary ?? '-'}  |  prio=${x.priority ?? '-'}  |  status=${x.status ?? '-'}`);
                });
                doc.addPage();
            }
            if (include.signatures) {
                await renderSignatures(doc, bucket, inspection);
            }
        }
        else {
            if (include.inspections) {
                doc.fontSize(12).fillColor('#0f172a').text('Inspections', { underline: true });
                doc.moveDown(0.4);
                inspections.forEach((x, i) => {
                    doc.fontSize(10).fillColor('#111827').text(`${i + 1}. ${String(x.id).slice(0, 8)} • property=${x.propertyId ?? '-'} • status=${x.status ?? '-'} • updated=${x.updatedAt ? new Date(x.updatedAt).toLocaleString() : '-'}`);
                });
                doc.moveDown(1);
            }
            if (include.findings) {
                doc.fontSize(12).fillColor('#0f172a').text('Findings', { underline: true });
                doc.moveDown(0.4);
                for (const f of findings) {
                    if (doc.y > doc.page.height - 240)
                        doc.addPage();
                    await renderFinding(doc, bucket, f, include.photos);
                }
                doc.moveDown(0.6);
            }
            if (include.workOrders) {
                doc.fontSize(12).fillColor('#0f172a').text('Work Orders', { underline: true });
                doc.moveDown(0.4);
                workOrders.forEach((x, i) => {
                    doc.fontSize(10).fillColor('#111827').text(`${i + 1}. ${String(x.id).slice(0, 8)} • prio=${x.priority ?? '-'} • status=${x.status ?? '-'} • ${x.summary ?? '-'} • due=${x.dueDate ? new Date(x.dueDate).toLocaleDateString() : '-'}`);
                });
                doc.moveDown(1);
            }
            if (inspectionId && include.signatures) {
                doc.addPage();
                await renderSignatures(doc, bucket, inspection);
            }
            doc.fontSize(9).fillColor('#64748b').text('Generated by Firebase Cloud Functions (pdfkit).').fillColor('#111827');
        }
        const pdfBuffer = await toBuffer(doc);
        const storagePath = `orgs/${orgId}/reports/${reportId}/report.pdf`;
        await bucket.file(storagePath).save(pdfBuffer, {
            contentType: 'application/pdf',
            metadata: { metadata: { orgId, reportId, requestedBy: uid } },
        });
        await reportRef.set({ status: 'ready', storagePath, counts, updatedAt: Date.now() }, { merge: true });
        return { reportId, storagePath, counts };
    }
    catch (e) {
        await reportRef.set({ status: 'error', errorMessage: e?.message ?? 'Unknown error', updatedAt: Date.now() }, { merge: true });
        throw new https_1.HttpsError('internal', e?.message ?? 'Report generation failed');
    }
});
/**
 * v2 HTTP
 */
exports.hello = (0, https_1.onRequest)((req, res) => {
    res.json({ ok: true, message: 'Functions ready. generateReportPdf available.' });
});
const ORG_ADMIN_ROLES = new Set([
    'super_admin',
    'agency_admin',
    'broker',
    'landlord',
    'property_manager',
    'admin',
    'manager',
]);
const ALLOWED_INVITE_ROLES = new Set([
    'agency_admin',
    'broker',
    'agent',
    'landlord',
    'tenant',
    'buyer',
    'seller',
    'vendor',
    'maintenance',
    'client',
    'staff',
]);
const TARGET_TO_COLLECTION = {
    agent: 'agents',
    landlord: 'landlords',
    tenant: 'tenants',
    buyer: 'clients',
    seller: 'clients',
    vendor: 'vendors',
    client: 'clients',
    staff: 'staff',
    manager: 'staff',
    property_manager: 'staff',
    maintenance: 'staff',
};
function nowMs() {
    return Date.now();
}
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}
function hashToken(raw) {
    return (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
}
function createRawToken() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
function getInviteBaseUrl() {
    const configured = process.env.INVITE_BASE_URL;
    return configured && configured.trim() ? configured.trim() : 'http://localhost:4200';
}
function normalizeHexColor(value, fallback = '#2563eb') {
    const v = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}
/**
 * Send an invitation email via SendGrid.
 * Requires SENDGRID_API_KEY, SENDGRID_FROM_EMAIL env vars (and optionally SENDGRID_EU_RESIDENCY=true).
 * Failures are non-fatal: logged but do not abort the callable.
 */
async function sendInvitationEmail(opts) {
    const attemptedAt = nowMs();
    const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
    const fromEmail = (process.env.SENDGRID_FROM_EMAIL || '').trim();
    if (!apiKey || !fromEmail) {
        console.warn('sendInvitationEmail: SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not configured – skipping email.');
        return {
            status: 'skipped',
            messageId: null,
            error: 'missing_sendgrid_config',
            attemptedAt,
        };
    }
    sgMail.setApiKey(apiKey);
    if (String(process.env.SENDGRID_EU_RESIDENCY || '').toLowerCase() === 'true') {
        sgMail.setDataResidency('eu');
    }
    const primaryColor = normalizeHexColor(opts.primaryColor);
    const headline = opts.isReminder
        ? `Rappel: invitation en attente pour ${opts.orgName}`
        : `Vous avez ete invite(e) a rejoindre ${opts.orgName}`;
    const cta = opts.isReminder ? 'Accepter l\'invitation maintenant' : 'Accepter l\'invitation';
    const expiryDate = new Date(opts.expiresAt).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    const msg = {
        to: opts.toEmail,
        from: fromEmail,
        subject: headline,
        text: [
            `Bonjour ${opts.displayName},`,
            '',
            opts.isReminder
                ? `Rappel: votre invitation pour rejoindre ${opts.orgName} en tant que ${opts.role} est toujours en attente.`
                : `Vous avez ete invite(e) a rejoindre ${opts.orgName} en tant que ${opts.role}.`,
            '',
            `Cliquez sur le lien ci-dessous pour accepter l'invitation (valide jusqu'au ${expiryDate}) :`,
            opts.inviteUrl,
            '',
            'Si vous n\'avez pas demandé cette invitation, ignorez ce message.',
        ].join('\n'),
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  ${opts.logoUrl ? `<div style="margin-bottom:12px;"><img src="${opts.logoUrl}" alt="${opts.orgName}" style="max-height:52px;max-width:220px;"/></div>` : ''}
  <h2 style="color:#1f2937;">${headline}</h2>
  <p>Bonjour <strong>${opts.displayName}</strong>,</p>
  <p>${opts.isReminder ? 'Votre invitation est toujours en attente.' : 'Vous avez ete invite(e)'} Rejoignez <strong>${opts.orgName}</strong> en tant que <strong>${opts.role}</strong>.</p>
  <p>Cette invitation expire le <strong>${expiryDate}</strong>.</p>
  <div style="margin:32px 0;text-align:center;">
    <a href="${opts.inviteUrl}"
       style="background:${primaryColor};color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;">
      ${cta}
    </a>
  </div>
  <p style="font-size:12px;color:#6b7280;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${opts.inviteUrl}</p>
  <p style="font-size:12px;color:#6b7280;">Si vous n'avez pas demandé cette invitation, ignorez ce message.</p>
</div>`,
    };
    try {
        const [resp] = await sgMail.send(msg);
        const messageId = String(resp?.headers?.['x-message-id'] || '');
        console.log(`sendInvitationEmail: email sent to ${opts.toEmail}`);
        return {
            status: 'sent',
            messageId: messageId || null,
            error: null,
            attemptedAt,
        };
    }
    catch (err) {
        const detail = err?.response?.body ? JSON.stringify(err.response.body) : String(err?.message || err);
        console.error(`sendInvitationEmail: failed for ${opts.toEmail} – ${detail}`);
        return {
            status: 'failed',
            messageId: null,
            error: detail,
            attemptedAt,
        };
    }
}
async function getUserDoc(uid) {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    return snap.exists ? snap.data() : null;
}
async function assertOrgManager(uid, orgId) {
    const db = admin.firestore();
    const user = await getUserDoc(uid);
    if (user?.globalRole === 'superadmin' || user?.role === 'super_admin') {
        return { role: 'super_admin', org: null };
    }
    let orgSnap = await db.doc(`organizations/${orgId}`).get();
    let org = orgSnap.exists ? orgSnap.data() : null;
    // Backward compatibility: some tenants still use only legacy /orgs documents.
    if (!org) {
        const legacyOrgSnap = await db.doc(`orgs/${orgId}`).get();
        if (legacyOrgSnap.exists) {
            org = legacyOrgSnap.data();
            // Best-effort mirror so newer flows relying on /organizations can work.
            await db.doc(`organizations/${orgId}`).set({
                id: orgId,
                ...org,
                updatedAt: nowMs(),
            }, { merge: true });
            orgSnap = await db.doc(`organizations/${orgId}`).get();
            org = orgSnap.exists ? orgSnap.data() : org;
        }
    }
    if (!org)
        throw new https_1.HttpsError('not-found', 'Organization not found.');
    const membershipSnap = await db
        .collection('organizationMembers')
        .where('orgId', '==', orgId)
        .where('userId', '==', uid)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    let role = '';
    if (!membershipSnap.empty) {
        role = String(membershipSnap.docs[0].data().role || '');
    }
    else {
        const legacy = await db.doc(`orgs/${orgId}/members/${uid}`).get();
        role = legacy.exists ? String(legacy.data()?.role || '') : '';
    }
    if (!ORG_ADMIN_ROLES.has(role)) {
        throw new https_1.HttpsError('permission-denied', 'Only authorized organization admins can perform this action.');
    }
    return { role: role, org };
}
async function writeActivity(orgId, actorUid, action, entityType, entityId, description) {
    const id = admin.firestore().collection('_').doc().id;
    await admin.firestore().doc(`orgs/${orgId}/activityLogs/${id}`).set({
        id,
        orgId,
        actorUid,
        action,
        entityType,
        entityId,
        description,
        createdAt: nowMs(),
    });
}
async function writeNotification(orgId, uid, title, message, type = 'info') {
    const id = admin.firestore().collection('_').doc().id;
    await admin.firestore().doc(`orgs/${orgId}/notifications/${id}`).set({
        id,
        orgId,
        uid,
        title,
        message,
        type,
        read: false,
        createdAt: nowMs(),
    });
}
async function getTargetProfile(orgId, targetType, targetId) {
    const coll = TARGET_TO_COLLECTION[targetType];
    if (!coll)
        throw new https_1.HttpsError('invalid-argument', `Unsupported targetType: ${targetType}`);
    const db = admin.firestore();
    const scopedRef = db.doc(`orgs/${orgId}/${coll}/${targetId}`);
    const scopedSnap = await scopedRef.get();
    if (scopedSnap.exists) {
        return { ref: scopedRef, data: scopedSnap.data() };
    }
    const rootRef = db.doc(`${coll}/${targetId}`);
    const rootSnap = await rootRef.get();
    if (rootSnap.exists && String(rootSnap.data()?.orgId || '') === orgId) {
        return { ref: rootRef, data: rootSnap.data() };
    }
    throw new https_1.HttpsError('not-found', 'Target business profile was not found.');
}
function resolveTargetDisplayName(target) {
    return (target.fullName ||
        target.displayName ||
        target.contactName ||
        target.companyName ||
        target.title ||
        'Invited user');
}
function roleRedirect(role) {
    if (role === 'super_admin')
        return '/superadmin';
    if (role === 'agency_admin' || role === 'broker')
        return '/agency/dashboard';
    if (role === 'agent')
        return '/agent/dashboard';
    if (role === 'landlord')
        return '/landlord/dashboard';
    if (role === 'tenant')
        return '/tenant/dashboard';
    if (role === 'buyer' || role === 'seller' || role === 'client')
        return '/client/dashboard';
    if (role === 'vendor')
        return '/vendor/dashboard';
    if (role === 'maintenance')
        return '/maintenance/dashboard';
    return '/dashboard';
}
async function expirePendingInvites(orgId, email, targetType, targetId) {
    const db = admin.firestore();
    const snap = await db
        .collection('invitations')
        .where('orgId', '==', orgId)
        .where('email', '==', email)
        .where('targetType', '==', targetType)
        .where('targetId', '==', targetId)
        .where('status', '==', 'pending')
        .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { status: 'expired', updatedAt: nowMs() }));
    if (!snap.empty)
        await batch.commit();
}
exports.createBusinessProfile = (0, https_1.onCall)(async (request) => {
    const uid = requireAuth(request);
    const data = request.data || {};
    const orgId = String(data.orgId || '').trim();
    const targetType = String(data.targetType || '').trim();
    const profile = (data.profile || {});
    if (!orgId || !targetType) {
        throw new https_1.HttpsError('invalid-argument', 'orgId and targetType are required.');
    }
    await assertOrgManager(uid, orgId);
    const coll = TARGET_TO_COLLECTION[targetType];
    if (!coll)
        throw new https_1.HttpsError('invalid-argument', 'Unsupported targetType.');
    const db = admin.firestore();
    const id = db.collection('_').doc().id;
    const now = nowMs();
    const email = normalizeEmail(String(profile.email || ''));
    const payload = {
        id,
        orgId,
        userId: null,
        authStatus: 'not_invited',
        invitationId: null,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        email,
        ...profile,
    };
    await db.doc(`orgs/${orgId}/${coll}/${id}`).set(payload, { merge: true });
    await writeActivity(orgId, uid, 'create_business_profile', coll, id, `Created ${targetType} profile`);
    return { id, orgId, targetType, authStatus: 'not_invited' };
});
exports.createInvitation = (0, https_1.onCall)({ secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_EU_RESIDENCY', 'INVITE_BASE_URL'] }, async (request) => {
    const uid = requireAuth(request);
    const data = request.data || {};
    const orgId = String(data.orgId || '').trim();
    const propertyId = String(data.propertyId || '').trim();
    const unitId = String(data.unitId || '').trim();
    const email = normalizeEmail(data.email || '');
    const role = String(data.role || '').trim();
    const targetType = String(data.targetType || '').trim();
    const targetId = String(data.targetId || '').trim();
    if (!orgId || !propertyId || !email || !role || !targetType || !targetId) {
        throw new https_1.HttpsError('invalid-argument', 'orgId, propertyId, email, role, targetType and targetId are required.');
    }
    if (!ALLOWED_INVITE_ROLES.has(role)) {
        throw new https_1.HttpsError('invalid-argument', `Role ${role} is not allowed for invitation.`);
    }
    await assertOrgManager(uid, orgId);
    const target = await getTargetProfile(orgId, targetType, targetId);
    const targetEmail = normalizeEmail(String(target.data.email || ''));
    if (!targetEmail || targetEmail !== email) {
        throw new https_1.HttpsError('failed-precondition', 'Invitation email must match target profile email.');
    }
    const db = admin.firestore();
    const existingPending = await db
        .collection('invitations')
        .where('orgId', '==', orgId)
        .where('email', '==', email)
        .where('targetType', '==', targetType)
        .where('targetId', '==', targetId)
        .where('status', '==', 'pending')
        .limit(10)
        .get();
    const hasActivePending = existingPending.docs.some((d) => {
        const expiresAt = Number(d.data()?.expiresAt || 0);
        return expiresAt > nowMs();
    });
    if (hasActivePending) {
        throw new https_1.HttpsError('already-exists', 'There is already an active pending invitation for this profile.');
    }
    const rawToken = createRawToken();
    const tokenHash = hashToken(rawToken);
    const invitationId = db.collection('_').doc().id;
    const now = nowMs();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    const invitation = {
        id: invitationId,
        orgId,
        propertyId,
        unitId: unitId || null,
        email,
        role,
        targetType,
        targetId,
        status: 'pending',
        tokenHash,
        expiresAt,
        invitedBy: uid,
        acceptedByUid: null,
        acceptedAt: null,
        createdAt: now,
        updatedAt: now,
    };
    await db.doc(`invitations/${invitationId}`).set(invitation);
    await target.ref.set({ authStatus: 'invited', invitationId, updatedAt: now }, { merge: true });
    await writeActivity(orgId, uid, 'create_invitation', 'invitation', invitationId, `Invitation created for ${email}`);
    const inviteUrl = `${getInviteBaseUrl()}/accept-invite?token=${rawToken}`;
    const orgSnap = await db.doc(`organizations/${orgId}`).get();
    const orgData = orgSnap.exists ? (orgSnap.data() || {}) : {};
    const orgName = String(orgData.name || orgId);
    const primaryColor = normalizeHexColor(orgData?.branding?.primaryColor || orgData?.primaryColor);
    const logoUrl = String(orgData?.branding?.logoUrl || orgData?.logoUrl || '');
    const displayName = resolveTargetDisplayName(target.data);
    const emailDelivery = await sendInvitationEmail({
        toEmail: email,
        inviteUrl,
        role,
        orgName,
        displayName,
        expiresAt,
        primaryColor,
        logoUrl,
        isReminder: false,
    });
    await db.doc(`invitations/${invitationId}`).set({
        emailDelivery,
        reminderCount: 0,
        lastReminderAt: null,
        updatedAt: nowMs(),
    }, { merge: true });
    return {
        invitationId,
        inviteUrl,
        expiresAt,
        orgId,
        propertyId,
        unitId: unitId || null,
        email,
        role,
        targetType,
        targetId,
        emailDeliveryStatus: emailDelivery.status,
    };
});
exports.resendInvitation = (0, https_1.onCall)({ secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_EU_RESIDENCY', 'INVITE_BASE_URL'] }, async (request) => {
    const uid = requireAuth(request);
    const invitationId = String(request.data?.invitationId || '').trim();
    if (!invitationId)
        throw new https_1.HttpsError('invalid-argument', 'invitationId is required.');
    const db = admin.firestore();
    const oldRef = db.doc(`invitations/${invitationId}`);
    const oldSnap = await oldRef.get();
    if (!oldSnap.exists)
        throw new https_1.HttpsError('not-found', 'Invitation not found.');
    const oldInv = oldSnap.data();
    await assertOrgManager(uid, String(oldInv.orgId || ''));
    if (oldInv.status === 'accepted') {
        throw new https_1.HttpsError('failed-precondition', 'Accepted invitations cannot be resent.');
    }
    await expirePendingInvites(oldInv.orgId, oldInv.email, oldInv.targetType, oldInv.targetId);
    const rawToken = createRawToken();
    const tokenHash = hashToken(rawToken);
    const newId = db.collection('_').doc().id;
    const now = nowMs();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    await db.doc(`invitations/${newId}`).set({
        id: newId,
        orgId: oldInv.orgId,
        propertyId: oldInv.propertyId || null,
        unitId: oldInv.unitId || null,
        email: oldInv.email,
        role: oldInv.role,
        targetType: oldInv.targetType,
        targetId: oldInv.targetId,
        status: 'pending',
        tokenHash,
        expiresAt,
        invitedBy: uid,
        acceptedByUid: null,
        acceptedAt: null,
        createdAt: now,
        updatedAt: now,
    });
    await oldRef.set({ status: 'expired', updatedAt: now }, { merge: true });
    const target = await getTargetProfile(oldInv.orgId, oldInv.targetType, oldInv.targetId);
    await target.ref.set({ authStatus: 'invited', invitationId: newId, updatedAt: now }, { merge: true });
    await writeActivity(oldInv.orgId, uid, 'resend_invitation', 'invitation', newId, `Invitation resent to ${oldInv.email}`);
    const inviteUrl = `${getInviteBaseUrl()}/accept-invite?token=${rawToken}`;
    const orgSnap2 = await admin.firestore().doc(`organizations/${oldInv.orgId}`).get();
    const orgData2 = orgSnap2.exists ? (orgSnap2.data() || {}) : {};
    const orgName2 = String(orgData2.name || oldInv.orgId);
    const primaryColor2 = normalizeHexColor(orgData2?.branding?.primaryColor || orgData2?.primaryColor);
    const logoUrl2 = String(orgData2?.branding?.logoUrl || orgData2?.logoUrl || '');
    const displayName2 = resolveTargetDisplayName(target.data);
    const emailDelivery = await sendInvitationEmail({
        toEmail: oldInv.email,
        inviteUrl,
        role: oldInv.role,
        orgName: orgName2,
        displayName: displayName2,
        expiresAt,
        primaryColor: primaryColor2,
        logoUrl: logoUrl2,
        isReminder: false,
    });
    await db.doc(`invitations/${newId}`).set({
        emailDelivery,
        reminderCount: Number(oldInv.reminderCount || 0),
        lastReminderAt: Number(oldInv.lastReminderAt || 0) || null,
        updatedAt: nowMs(),
    }, { merge: true });
    return {
        invitationId: newId,
        inviteUrl,
        expiresAt,
        orgId: oldInv.orgId,
        propertyId: oldInv.propertyId || null,
        unitId: oldInv.unitId || null,
        emailDeliveryStatus: emailDelivery.status,
    };
});
exports.remindPendingInvitations = (0, scheduler_1.onSchedule)({
    schedule: 'every day 09:00',
    timeZone: 'UTC',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_EU_RESIDENCY', 'INVITE_BASE_URL'],
    region: 'us-central1',
}, async () => {
    const db = admin.firestore();
    const now = nowMs();
    const reminderAfterDays = Math.max(1, Number(process.env.INVITE_REMINDER_DAYS || '3'));
    const maxAutoReminders = Math.max(1, Number(process.env.MAX_AUTO_REMINDERS || '1'));
    const cutoff = now - reminderAfterDays * 24 * 60 * 60 * 1000;
    const pending = await db
        .collection('invitations')
        .where('status', '==', 'pending')
        .limit(200)
        .get();
    let checked = 0;
    let sent = 0;
    let failed = 0;
    for (const doc of pending.docs) {
        checked += 1;
        const inv = doc.data();
        const createdAt = Number(inv.createdAt || 0);
        const expiresAt = Number(inv.expiresAt || 0);
        const reminderCount = Number(inv.reminderCount || 0);
        const lastReminderAt = Number(inv.lastReminderAt || 0);
        if (!createdAt || createdAt > cutoff)
            continue;
        if (!expiresAt || expiresAt <= now)
            continue;
        if (reminderCount >= maxAutoReminders)
            continue;
        if (lastReminderAt && (now - lastReminderAt) < 24 * 60 * 60 * 1000)
            continue;
        try {
            const orgId = String(inv.orgId || '').trim();
            const email = normalizeEmail(String(inv.email || ''));
            const role = String(inv.role || '').trim();
            const targetType = String(inv.targetType || '').trim();
            const targetId = String(inv.targetId || '').trim();
            if (!orgId || !email || !role || !targetType || !targetId)
                continue;
            const target = await getTargetProfile(orgId, targetType, targetId);
            const targetEmail = normalizeEmail(String(target.data.email || ''));
            if (!targetEmail || targetEmail !== email)
                continue;
            const rawToken = createRawToken();
            const tokenHash = hashToken(rawToken);
            const newId = db.collection('_').doc().id;
            const newExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
            const newInviteRef = db.doc(`invitations/${newId}`);
            await newInviteRef.set({
                id: newId,
                orgId,
                propertyId: inv.propertyId || null,
                unitId: inv.unitId || null,
                email,
                role,
                targetType,
                targetId,
                status: 'pending',
                tokenHash,
                expiresAt: newExpiresAt,
                invitedBy: String(inv.invitedBy || 'system'),
                acceptedByUid: null,
                acceptedAt: null,
                reminderCount: reminderCount + 1,
                lastReminderAt: now,
                reminderSourceId: doc.id,
                createdAt: now,
                updatedAt: now,
            });
            await doc.ref.set({ status: 'expired', updatedAt: now, replacedByInvitationId: newId }, { merge: true });
            await target.ref.set({ authStatus: 'invited', invitationId: newId, updatedAt: now }, { merge: true });
            const inviteUrl = `${getInviteBaseUrl()}/accept-invite?token=${rawToken}`;
            const orgSnap = await db.doc(`organizations/${orgId}`).get();
            const orgData = orgSnap.exists ? (orgSnap.data() || {}) : {};
            const orgName = String(orgData.name || orgId);
            const primaryColor = normalizeHexColor(orgData?.branding?.primaryColor || orgData?.primaryColor);
            const logoUrl = String(orgData?.branding?.logoUrl || orgData?.logoUrl || '');
            const displayName = resolveTargetDisplayName(target.data);
            const emailDelivery = await sendInvitationEmail({
                toEmail: email,
                inviteUrl,
                role,
                orgName,
                displayName,
                expiresAt: newExpiresAt,
                primaryColor,
                logoUrl,
                isReminder: true,
            });
            await newInviteRef.set({ emailDelivery, updatedAt: nowMs() }, { merge: true });
            await writeActivity(orgId, 'system', 'auto_remind_invitation', 'invitation', newId, `Automatic reminder sent to ${email}`);
            if (emailDelivery.status === 'sent') {
                sent += 1;
            }
            else {
                failed += 1;
            }
        }
        catch (err) {
            failed += 1;
            console.error('remindPendingInvitations: failed processing pending invite', err?.message || err);
        }
    }
    console.log(`remindPendingInvitations summary: checked=${checked}, sent=${sent}, failed=${failed}`);
});
exports.revokeInvitation = (0, https_1.onCall)(async (request) => {
    const uid = requireAuth(request);
    const invitationId = String(request.data?.invitationId || '').trim();
    if (!invitationId)
        throw new https_1.HttpsError('invalid-argument', 'invitationId is required.');
    const db = admin.firestore();
    const ref = db.doc(`invitations/${invitationId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Invitation not found.');
    const inv = snap.data();
    await assertOrgManager(uid, String(inv.orgId || ''));
    await ref.set({ status: 'revoked', updatedAt: nowMs() }, { merge: true });
    const target = await getTargetProfile(inv.orgId, inv.targetType, inv.targetId);
    const currentInvitationId = String(target.data.invitationId || '');
    if (currentInvitationId === invitationId) {
        await target.ref.set({ authStatus: 'not_invited', invitationId: null, updatedAt: nowMs() }, { merge: true });
    }
    await writeActivity(inv.orgId, uid, 'revoke_invitation', 'invitation', invitationId, `Invitation revoked for ${inv.email}`);
    return { invitationId, status: 'revoked' };
});
exports.validateInvitation = (0, https_1.onCall)(async (request) => {
    const rawToken = String(request.data?.token || '').trim();
    if (!rawToken)
        throw new https_1.HttpsError('invalid-argument', 'token is required.');
    const tokenHash = hashToken(rawToken);
    const db = admin.firestore();
    const snap = await db.collection('invitations').where('tokenHash', '==', tokenHash).limit(1).get();
    if (snap.empty)
        throw new https_1.HttpsError('not-found', 'Invitation token is invalid.');
    const invitation = snap.docs[0].data();
    if (invitation.status !== 'pending') {
        throw new https_1.HttpsError('failed-precondition', 'Invitation is not pending.');
    }
    if (Number(invitation.expiresAt || 0) <= nowMs()) {
        throw new https_1.HttpsError('deadline-exceeded', 'Invitation has expired.');
    }
    const orgSnap = await db.doc(`orgs/${invitation.orgId}`).get();
    const orgName = orgSnap.exists ? String(orgSnap.data()?.name || invitation.orgId) : invitation.orgId;
    const target = await getTargetProfile(invitation.orgId, invitation.targetType, invitation.targetId);
    return {
        orgId: invitation.orgId,
        propertyId: invitation.propertyId || null,
        unitId: invitation.unitId || null,
        orgName,
        email: invitation.email,
        role: invitation.role,
        targetType: invitation.targetType,
        targetDisplayName: resolveTargetDisplayName(target.data),
        expiresAt: invitation.expiresAt,
    };
});
exports.acceptInvitation = (0, https_1.onCall)(async (request) => {
    const data = request.data || {};
    const rawToken = String(data.token || '').trim();
    const password = String(data.password || '');
    const displayName = String(data.displayName || '').trim();
    const phone = String(data.phone || '').trim();
    if (!rawToken || !password || !displayName) {
        throw new https_1.HttpsError('invalid-argument', 'token, password, and displayName are required.');
    }
    if (password.length < 8) {
        throw new https_1.HttpsError('invalid-argument', 'Password must be at least 8 characters.');
    }
    const db = admin.firestore();
    const tokenHash = hashToken(rawToken);
    const invSnap = await db.collection('invitations').where('tokenHash', '==', tokenHash).limit(1).get();
    if (invSnap.empty)
        throw new https_1.HttpsError('not-found', 'Invitation token is invalid.');
    const invRef = invSnap.docs[0].ref;
    const inv = invSnap.docs[0].data();
    if (inv.status !== 'pending')
        throw new https_1.HttpsError('failed-precondition', 'Invitation is not pending.');
    if (Number(inv.expiresAt || 0) <= nowMs()) {
        await invRef.set({ status: 'expired', updatedAt: nowMs() }, { merge: true });
        throw new https_1.HttpsError('deadline-exceeded', 'Invitation has expired.');
    }
    const target = await getTargetProfile(inv.orgId, inv.targetType, inv.targetId);
    const targetEmail = normalizeEmail(String(target.data.email || ''));
    if (!targetEmail || targetEmail !== normalizeEmail(inv.email)) {
        throw new https_1.HttpsError('failed-precondition', 'Target profile email mismatch.');
    }
    let uid = '';
    let existingAuthUser = null;
    try {
        existingAuthUser = await admin.auth().getUserByEmail(inv.email);
    }
    catch {
        existingAuthUser = null;
    }
    if (!existingAuthUser) {
        const created = await admin.auth().createUser({
            email: inv.email,
            password,
            displayName,
            // phoneNumber is stored in Firestore only (Firebase Auth requires strict E.164 format)
            emailVerified: false,
            disabled: false,
        });
        uid = created.uid;
    }
    else {
        uid = existingAuthUser.uid;
        if (!request.auth?.uid) {
            throw new https_1.HttpsError('failed-precondition', 'An account with this email already exists. Please sign in before accepting the invitation.');
        }
        if (request.auth.uid !== uid) {
            throw new https_1.HttpsError('permission-denied', 'Authenticated user does not match invited email account.');
        }
    }
    const now = nowMs();
    const usersRef = db.doc(`users/${uid}`);
    const userSnap = await usersRef.get();
    const existingUser = userSnap.exists ? userSnap.data() : {};
    await usersRef.set({
        uid,
        email: normalizeEmail(inv.email),
        displayName,
        phone: phone || existingUser.phone || '',
        defaultOrgId: existingUser.defaultOrgId || inv.orgId,
        activeOrgId: inv.orgId,
        globalRole: existingUser.globalRole || 'user',
        role: inv.role,
        status: 'active',
        createdAt: existingUser.createdAt || now,
        updatedAt: now,
        lastLoginAt: now,
        lastOrgId: inv.orgId,
    }, { merge: true });
    const membershipId = `${inv.orgId}_${uid}`;
    await db.doc(`organizationMembers/${membershipId}`).set({
        id: membershipId,
        orgId: inv.orgId,
        userId: uid,
        email: normalizeEmail(inv.email),
        role: inv.role,
        defaultPropertyId: inv.propertyId || null,
        propertyIds: inv.propertyId ? [inv.propertyId] : [],
        targetType: inv.targetType,
        targetId: inv.targetId,
        status: 'active',
        invitedBy: inv.invitedBy,
        joinedAt: now,
        createdAt: inv.createdAt || now,
        updatedAt: now,
    });
    await db.doc(`orgs/${inv.orgId}/members/${uid}`).set({
        uid,
        userId: uid,
        email: normalizeEmail(inv.email),
        role: inv.role,
        status: 'active',
        defaultPropertyId: inv.propertyId || null,
        propertyIds: inv.propertyId ? admin.firestore.FieldValue.arrayUnion(inv.propertyId) : [],
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    await target.ref.set({
        userId: uid,
        userUid: uid,
        authStatus: 'active',
        invitationId: inv.id,
        updatedAt: now,
    }, { merge: true });
    await invRef.set({
        status: 'accepted',
        acceptedByUid: uid,
        acceptedAt: now,
        updatedAt: now,
    }, { merge: true });
    const propertyAssignmentId = `${inv.orgId}_${String(inv.propertyId || 'none')}_${uid}_${inv.targetType}_${inv.targetId}`;
    await db.doc(`propertyAssignments/${propertyAssignmentId}`).set({
        id: propertyAssignmentId,
        orgId: inv.orgId,
        propertyId: inv.propertyId || null,
        unitId: inv.unitId || null,
        userId: uid,
        email: normalizeEmail(inv.email),
        role: inv.role,
        targetType: inv.targetType,
        targetId: inv.targetId,
        accessLevel: inv.unitId ? 'unit' : 'property',
        status: 'active',
        invitedBy: inv.invitedBy,
        invitationId: inv.id,
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    await writeActivity(inv.orgId, uid, 'accept_invitation', 'invitation', inv.id, `${inv.email} accepted invitation`);
    await writeNotification(inv.orgId, uid, 'Welcome to organization', `You were added as ${inv.role}`, 'success');
    return {
        uid,
        orgId: inv.orgId,
        propertyId: inv.propertyId || null,
        unitId: inv.unitId || null,
        role: inv.role,
        redirect: roleRedirect(inv.role),
    };
});
exports.switchOrganization = (0, https_1.onCall)(async (request) => {
    const uid = requireAuth(request);
    const orgId = String(request.data?.orgId || '').trim();
    if (!orgId)
        throw new https_1.HttpsError('invalid-argument', 'orgId is required.');
    const db = admin.firestore();
    const activeMembership = await db
        .collection('organizationMembers')
        .where('orgId', '==', orgId)
        .where('userId', '==', uid)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    let role = '';
    if (!activeMembership.empty) {
        role = String(activeMembership.docs[0].data().role || '');
    }
    else {
        const legacy = await db.doc(`orgs/${orgId}/members/${uid}`).get();
        const legacyStatus = legacy.exists ? String(legacy.data()?.status || '') : '';
        if (!legacy.exists || legacyStatus !== 'active') {
            throw new https_1.HttpsError('permission-denied', 'You are not an active member of this organization.');
        }
        role = String(legacy.data()?.role || '');
    }
    await db.doc(`users/${uid}`).set({
        activeOrgId: orgId,
        lastOrgId: orgId,
        updatedAt: nowMs(),
    }, { merge: true });
    return { orgId, role, redirect: roleRedirect(role) };
});
//# sourceMappingURL=index.js.map