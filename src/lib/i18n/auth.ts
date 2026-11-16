const labels = {
  fr: {
    signIn: 'Connexion', signInDescription: 'Accédez à votre espace personnel.',
    email: 'Adresse e-mail', password: 'Mot de passe', signInButton: 'Se connecter',
    signInBusy: 'Connexion…', invalidCredentials: 'Identifiants incorrects ou adresse non confirmée.',
    genericError: 'Opération impossible pour le moment.', register: 'Créer un compte',
    verifyEmail: 'Confirmer mon adresse', dashboard: 'Mon espace',
    loggedIn: 'Session App vérifiée.', signOut: 'Se déconnecter',
    verifyingSession: 'Vérification de la session…', verificationTitle: 'Confirmation de l’adresse',
    verificationSuccess: 'Votre adresse a été confirmée. Vous pouvez vous connecter.',
    verificationFailed: 'Ce lien est invalide, expiré ou déjà utilisé.',
    verificationBusy: 'Confirmation en cours…', resendTitle: 'Renvoyer la confirmation',
    resendDescription: 'Saisissez votre adresse pour demander un nouveau lien de confirmation.',
    resendButton: 'Demander un nouveau lien',
    resendBusy: 'Demande en cours…',
    resendAccepted: 'Si le compte est en attente, un lien de confirmation sera envoyé.',
    backToLogin: 'Revenir à la connexion'
  },
  en: {
    signIn: 'Sign in', signInDescription: 'Access your personal space.',
    email: 'Email address', password: 'Password', signInButton: 'Sign in',
    signInBusy: 'Signing in…', invalidCredentials: 'Invalid credentials or unverified email.',
    genericError: 'Operation currently unavailable.', register: 'Create account',
    verifyEmail: 'Verify email', dashboard: 'My space',
    loggedIn: 'App session verified.', signOut: 'Sign out',
    verifyingSession: 'Checking session…', verificationTitle: 'Verify your email',
    verificationSuccess: 'Your email is verified. You can now sign in.',
    verificationFailed: 'This link is invalid, expired or has already been used.',
    verificationBusy: 'Verifying…', resendTitle: 'Resend verification',
    resendDescription: 'Enter your email to request a new verification link.',
    resendButton: 'Request new link',
    resendBusy: 'Requesting…',
    resendAccepted: 'If the account is pending, a verification link will be sent.',
    backToLogin: 'Back to sign in'
  }
};
export type AuthLabels = (typeof labels)['fr'];
export function authLabels(lang: string | null | undefined): AuthLabels {
  return lang?.toLowerCase().split('-')[0] === 'fr' ? labels.fr : labels.en;
}
