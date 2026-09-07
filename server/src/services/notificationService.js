import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const fromEmail = process.env.EMAIL_FROM || '"Rehainsh Rentals" <no-reply@rehainsh.pk>';

let transporter = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send an automated rent due notification email.
 */
export async function sendRentDueNotification({
  toEmail,
  tenantName,
  propertyName,
  unitNumber,
  amountPkr,
  rentMonth,
  dueDate,
}) {
  const subject = `Rent Due Notice for ${rentMonth} — ${propertyName} (Unit ${unitNumber})`;
  const text = `Dear ${tenantName},\n\nThis is a friendly reminder that your rent for ${propertyName} (Unit ${unitNumber}) for the month of ${rentMonth} is due on ${dueDate}.\n\nTotal Due: PKR ${Number(amountPkr).toLocaleString('en-PK')}\n\nPlease submit payment through your Rehainsh Tenant Portal.\n\nWarm regards,\nRehainsh Property Management`;

  if (!transporter) {
    console.log(`[notificationService:simulated] 📧 Sent Rent Due Email to ${toEmail}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Amount: PKR ${Number(amountPkr).toLocaleString('en-PK')} | Due: ${dueDate}`);
    return { delivered: false, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error('[notificationService] Failed to send email via SMTP:', err.message);
    return { delivered: false, error: err.message };
  }
}

/**
 * Send a rent payment receipt email with optional PDF receipt attachment.
 */
export async function sendPaymentReceiptNotification({
  toEmail,
  tenantName,
  amountPkr,
  rentMonth,
  reference,
  pdfBuffer,
}) {
  const subject = `Payment Confirmation: Rent for ${rentMonth} (PKR ${Number(amountPkr).toLocaleString('en-PK')})`;
  const text = `Dear ${tenantName},\n\nThank you! Your rent payment of PKR ${Number(amountPkr).toLocaleString('en-PK')} for ${rentMonth} has been received and verified.\n\nReference: ${reference}\n\nAttached is your official computer-generated receipt.\n\nWarm regards,\nRehainsh Rentals`;

  const attachments = pdfBuffer
    ? [
        {
          filename: `Receipt-${rentMonth}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : [];

  if (!transporter) {
    console.log(`[notificationService:simulated] 🧾 Sent Payment Receipt Email to ${toEmail}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Reference: ${reference} (PDF receipt generated)`);
    return { delivered: false, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text,
      attachments,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error('[notificationService] Failed to send payment receipt:', err.message);
    return { delivered: false, error: err.message };
  }
}

/**
 * Send a maintenance request update notification.
 */
export async function sendMaintenanceAlert({
  toEmail,
  tenantName,
  requestId,
  title,
  newStatus,
  ownerResponse,
}) {
  const subject = `Maintenance Update: ${title} [${newStatus.toUpperCase()}]`;
  const text = `Dear ${tenantName},\n\nYour maintenance request (#${requestId}) "${title}" has been updated to: ${newStatus.toUpperCase()}.\n\nLandlord Notes: ${ownerResponse || 'No additional notes provided.'}\n\nCheck your Tenant Portal for full details.`;

  if (!transporter) {
    console.log(`[notificationService:simulated] 🔧 Sent Maintenance Alert to ${toEmail}:`);
    console.log(`  Status: ${newStatus} | Title: ${title}`);
    return { delivered: false, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error('[notificationService] Failed to send maintenance alert:', err.message);
    return { delivered: false, error: err.message };
  }
}
