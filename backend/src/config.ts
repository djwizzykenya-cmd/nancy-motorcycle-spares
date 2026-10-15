import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET"
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export const config = {
  port: parseInt(process.env.PORT || process.env.BACKEND_PORT || "5000", 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  nodeEnv: process.env.NODE_ENV || "development",
  redisUrl: process.env.REDIS_URL,
  
  // Payment
  stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  pesapalApiKey: process.env.PESAPAL_API_KEY,
  pesapalSecretKey: process.env.PESAPAL_SECRET_KEY,
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY,
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET,
  mpesaShortcode: process.env.MPESA_SHORTCODE,
  mpesaPasskey: process.env.MPESA_PASSKEY,
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL,
  mpesaEnvironment: process.env.MPESA_ENVIRONMENT || "sandbox",
  mpesaTransactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
  mpesaTransactionDescription: process.env.MPESA_TRANSACTION_DESCRIPTION || "Order payment",
  
  // Email
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  
  // SMS
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  
  // Storage
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  awsEndpoint: process.env.AWS_ENDPOINT,
  awsPublicBaseUrl: process.env.AWS_PUBLIC_BASE_URL,
};
