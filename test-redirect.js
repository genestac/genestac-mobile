const { makeRedirectUri } = require('expo-auth-session');
console.log("Without options:", makeRedirectUri());
console.log("With genestac scheme:", makeRedirectUri({ scheme: 'genestac', path: 'auth/callback' }));
