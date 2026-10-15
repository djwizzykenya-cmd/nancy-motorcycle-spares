import { defineRailway, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const nancyMotorcycleSparesApi = service("nancy-motorcycle-spares-api", {
    replicas: { "sfo": 1 },
    build: "npm install --prefix backend --no-audit --no-fund && npm run build --prefix backend",
    start: "npm start --prefix backend",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    preDeploy: "npm run db:deploy --prefix backend",
    env: {
      DATABASE_URL: preserve(),
      JWT_EXPIRE: preserve(),
      JWT_SECRET: preserve(),
      NODE_ENV: preserve(),
      AWS_ACCESS_KEY_ID: preserve(),
      AWS_SECRET_ACCESS_KEY: preserve(),
      AWS_REGION: preserve(),
      AWS_S3_BUCKET: preserve(),
      AWS_ENDPOINT: preserve(),
      AWS_PUBLIC_BASE_URL: preserve(),
      MPESA_CONSUMER_KEY: preserve(),
      MPESA_CONSUMER_SECRET: preserve(),
      MPESA_SHORTCODE: preserve(),
      MPESA_PASSKEY: preserve(),
      MPESA_CALLBACK_URL: preserve(),
      MPESA_ENVIRONMENT: preserve(),
      MPESA_TRANSACTION_TYPE: preserve(),
      MPESA_TRANSACTION_DESCRIPTION: preserve()
    }
  });

  return project("nancy-motorcycle-spares-backend", {
    resources: [nancyMotorcycleSparesApi],
  });
});
