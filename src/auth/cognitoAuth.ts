// Serviço de autenticação com AWS Cognito (SPA)
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
  CognitoRefreshToken,
  CognitoUserAttribute,
  ISignUpResult,
} from "amazon-cognito-identity-js";
import { userPool } from "../aws/cognito";

/** Guarda os tokens do usuário no localStorage */
function persistTokens(session: CognitoUserSession) {
  localStorage.setItem("idToken", session.getIdToken().getJwtToken());
  localStorage.setItem("accessToken", session.getAccessToken().getJwtToken());
  localStorage.setItem("refreshToken", session.getRefreshToken().getToken());
}

export type LoginParams = { email: string; password: string };

export function loginWithCognito({ email, password }: LoginParams): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const auth = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(auth, {
      onSuccess: (session: CognitoUserSession) => {
        persistTokens(session);
        resolve();
      },
      onFailure: (err: unknown) => reject(err),
      newPasswordRequired: () => {
        reject({ message: "Senha temporária: é preciso definir uma nova senha." });
      },
    });
  });
}

/** Parâmetros do cadastro (compatível com os dois nomes de client) */
export type RegisterParams = {
  email: string;
  password: string;
  name?: string;
  phone?: string;        
  clienteId?: string;    
  clientId?: string;     
};

/** Cadastro (signUp). Envia para a AWS e dispara email com código. */
export function registerWithCognito(params: RegisterParams): Promise<ISignUpResult> {
  const { email, password, name, phone, clienteId, clientId } = params;

  // decide qual valor usar (clienteId preferencial; clientId como fallback)
  const cid = (clienteId ?? clientId)?.trim();
  const attrs: CognitoUserAttribute[] = [
    new CognitoUserAttribute({ Name: "email", Value: email }), 
  ];

  if (name) {
    attrs.push(new CognitoUserAttribute({ Name: "name", Value: name }));
  }
  if (phone) {
    attrs.push(new CognitoUserAttribute({ Name: "phone_number", Value: phone }));
  }
  // IMPORTANTE: nome do atributo precisa existir no User Pool e estar permitido em "Write attributes"
  if (cid) {
    attrs.push(new CognitoUserAttribute({ Name: "custom:cliente_id", Value: cid }));
  }

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attrs, [], (err, data) => {
      if (err || !data) return reject(err);
      resolve(data);
    });
  });
}

/** Confirmação do cadastro com o código recebido por email */
export function confirmRegistration(email: string, code: string): Promise<string> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err, result) => {
      if (err || !result) return reject(err);
      resolve(result);
    });
  });
}

/** Reenvia o código de confirmação */
export function resendConfirmationCode(email: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  return new Promise((resolve, reject) => {
    user.resendConfirmationCode((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Tenta renovar o accessToken com o refreshToken atual */
export function refreshAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const current: CognitoUser | null = userPool.getCurrentUser();
    if (!current) return resolve(null);

    current.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) return resolve(null);

      const rt: CognitoRefreshToken = session.getRefreshToken();
      current.refreshSession(rt, (err2: Error | null, newSession: CognitoUserSession) => {
        if (err2) return resolve(null);
        persistTokens(newSession);
        resolve(newSession.getAccessToken().getJwtToken());
      });
    });
  });
}

export function signOut() {
  userPool.getCurrentUser()?.signOut();
  localStorage.removeItem("idToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}
