import { CognitoUserPool } from "amazon-cognito-identity-js";

const USER_POOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID!;

if (!USER_POOL_ID || !CLIENT_ID) {
  throw new Error("Cognito env vars ausentes. Verifique .env");
}

export const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});
