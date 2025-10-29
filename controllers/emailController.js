const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

/**
 * Configure transporter for Gmail (App Password required)
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify connection at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email service connection failed:", error.message);
  } else {
    console.log("✅ Email service ready to send messages!");
  }
});

/**
 * Generate ticket PDF with QR code and details
 */
const generateTicketPDF = async (event, quantity, qrCodeData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      doc.fontSize(22).fillColor("#4CAF50").text("🎟️ Eventify Ticket", { align: "center" });
      doc.moveDown();

      doc.fontSize(14).fillColor("#000").text(`Event: ${event.title}`);
      doc.text(`Date & Time: ${new Date(event.dateTime).toLocaleString()}`);
      doc.text(`Venue: ${event.venue || "TBA"}`);
      doc.text(`Quantity: ${quantity}`);
      doc.moveDown(2);

      if (qrCodeData && qrCodeData.startsWith("data:image/png;base64,")) {
        const base64Image = qrCodeData.split("base64,")[1];
        const imgBuffer = Buffer.from(base64Image, "base64");
        doc.image(imgBuffer, { align: "center", width: 200 });
      } else {
        doc.text("⚠️ QR code not available", { align: "center" });
      }

      doc.moveDown(2);
      doc.fontSize(12).text("Please present this ticket at the event entrance.", {
        align: "center",
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Send ticket confirmation email with QR + PDF
 */
const sendTicketEmail = async (userEmail, ticket) => {
  try {
    const { event, quantity, qrCodeData } = ticket;
    console.log("📧 Sending email to:", userEmail);
    console.log("🎟️ Event:", event?.title, "| Quantity:", quantity);

    // 🧾 Generate PDF
    console.log("📄 Generating PDF...");
    const pdfBuffer = await generateTicketPDF(event, quantity, qrCodeData);
    console.log("✅ PDF generated, size:", pdfBuffer.length, "bytes");

    // 🖼 Validate QR attachment
    let qrAttachment = null;
    if (qrCodeData?.startsWith("data:image/png;base64,")) {
      qrAttachment = {
        filename: "ticket-qr.png",
        content: qrCodeData.split("base64,")[1],
        encoding: "base64",
        cid: "qrcode", // reference for inline <img src="cid:qrcode">
      };
      console.log("🖼 QR attachment prepared");
    } else {
      console.warn("⚠️ QR data invalid or missing — skipping inline QR");
    }

    // 📬 Build attachments array
    const attachments = [
      ...(qrAttachment ? [qrAttachment] : []),
      {
        filename: `${event.title}-ticket.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];

    // 💌 Send email
    const info = await transporter.sendMail({
      from: `"Eventify Tickets" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🎟️ Your Ticket for "${event.title}"`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <h2 style="color: #4CAF50;">🎉 Ticket Confirmed!</h2>
          <p>Thank you for your purchase. Here are your ticket details:</p>

          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr><td><strong>Event:</strong></td><td>${event.title}</td></tr>
            <tr><td><strong>Date & Time:</strong></td><td>${new Date(event.dateTime).toLocaleString()}</td></tr>
            <tr><td><strong>Venue:</strong></td><td>${event.venue ?? "TBA"}</td></tr>
            <tr><td><strong>Quantity:</strong></td><td>${quantity}</td></tr>
          </table>

          <p>Scan the QR code below at the event entrance:</p>
          ${
            qrAttachment
              ? `<div style="text-align: center; margin: 20px 0;">
                  <img src="cid:qrcode" alt="Ticket QR Code" style="max-width: 200px;" />
                 </div>`
              : `<p><em>QR code could not be displayed. Please check attached PDF ticket.</em></p>`
          }

          <p>Your PDF ticket is also attached to this email.</p>
          <p>We look forward to seeing you at the event!</p>
          <p>– The Eventify Team</p>
        </div>
      `,
      attachments,
    });

    console.log("✅ Ticket email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending ticket email:", err.message);
  }
};

module.exports = { sendTicketEmail };
