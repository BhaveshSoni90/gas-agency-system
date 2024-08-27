const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Initialize Sendinblue API client
const apiKey=
"xkeysib-0f01d3cca92f9c22164a10cde8811aaa8d557f1e6745d68a727c60fa4a8f31d5-" +
"l8xqvHNdwZcYGafu";
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = apiKey;
const sendinblue = new SibApiV3Sdk.TransactionalEmailsApi();

// Function to send an email
exports.sendEmail = onRequest(async (request, response) => {
  const {to, subject, html} = request.body;

  try {
    if (!to || !subject || !html) {
      response.status(400).send(
          "Missing required parameters: to, subject, or html.",
      );
      return;
    }

    const sender = {
      email: "your-email@example.com",
      name: "Your Name",
    };

    const emailData = {
      sender,
      to: [{email: to}],
      subject,
      htmlContent: html,
    };

    await sendinblue.sendTransacEmail(emailData);

    response.status(200).send("Email sent successfully.");
  } catch (error) {
    logger.error("Error sending email:", error);
    response.status(500).send("Error sending email.");
  }
});
