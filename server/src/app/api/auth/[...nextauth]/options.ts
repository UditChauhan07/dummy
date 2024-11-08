import CredentialsProvider from "next-auth/providers/credentials";
import KeycloakProvider from "next-auth/providers/keycloak";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";

import { verifyAuthenticator } from "@/utils/authenticator/authenticator";
import { authenticateUser } from "@/lib/actions/auth";
import { getKeycloakToken } from '@/utils/keycloak';
import { decodeToken } from '@/utils/tokenizer';
import User from '@/lib/models/user';
import logger from "@/utils/logger";
import "@/types/next-auth";

const NEXTAUTH_SESSION_EXPIRES = Number(process.env.NEXTAUTH_SESSION_EXPIRES) || 60 * 60 * 24; // 1 day

// Extend the User type to include tenant
interface ExtendedUser {
    id: string;
    email: string;
    name: string;
    username: string;
    image?: string;
    proToken: string;
    tenant?: string;
}

export const options: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
            profile: async (profile): Promise<ExtendedUser> => {
                logger.info("Starting Google OAuth")
                const user = await User.findUserByEmail(profile.email);
                if (!user || !user.user_id) {
                    logger.warn("User not found with email", profile.email);
                    throw new Error("User not found");
                }
                logger.info("User sign in successful with email", profile.email);
                return {
                    id: user.user_id.toString(),
                    email: user.email,
                    name: `${user.first_name} ${user.last_name}`,
                    username: user.username,
                    image: profile.picture,
                    proToken: '',
                    tenant: user.tenant
                };
            },
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                twoFactorCode: { label: "2FA Code", type: "text" },
            },
            async authorize(credentials): Promise<ExtendedUser | null> {
                logger.info("Starting Credentials OAuth")
                try {
                    logger.debug("Authorizing email", credentials?.email);
                    if (!credentials?.email || !credentials.password) {
                        logger.warn("Missing credentials");
                        return null;
                    }
                    const user = await authenticateUser(credentials.email, credentials.password);
                    if (!user) { return null; }
                    if (user.two_factor_enabled) {
                        if (!credentials.twoFactorCode) {
                            logger.warn("2FA code required for email", credentials.email);
                            return null;
                        }
                        if (!user.two_factor_secret) {
                            logger.warn("2FA secret not found for email", credentials.email);
                            return null;
                        }
                        const isValid2FA = await verifyAuthenticator(credentials.twoFactorCode, user.two_factor_secret);
                        if (!isValid2FA) {
                            logger.warn("Invalid 2FA code for email", credentials.email);
                            return null;
                        }
                    }
                    logger.info("User sign in successful with email", credentials.email);
                    return {
                        id: user.user_id.toString(),
                        email: user.email,
                        username: user.username,
                        image: user.image || '/image/avatar-purple-big.png',
                        name: `${user.first_name} ${user.last_name}`,
                        proToken: '',
                        tenant: user.tenant
                    };
                } catch (error) {
                    logger.warn("Error authorizing email", credentials?.email, error);
                    throw error;
                }
            },
        }),
        KeycloakProvider({
            clientId: process.env.KEYCLOAK_CLIENT_ID as string,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET as string,
            issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
            profile(profile): ExtendedUser {
                logger.info("Starting Keycloak OAuth")
                return {
                    id: profile.sub,
                    name: profile.name ?? profile.preferred_username,
                    email: profile.email,
                    image: profile.picture,
                    username: profile.preferred_username,
                    proToken: '',
                    tenant: profile.tenant // Assuming Keycloak provides tenant information
                }
            },
        }),
        CredentialsProvider({
            id: "keycloak-credentials",
            name: "Keycloak-credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                twoFactorCode: { label: "2FA Code", type: "text" },
            },
            async authorize(credentials): Promise<ExtendedUser | null> {
                logger.info("Starting Keycloak Credentials OAuth")
                if (!credentials?.email || !credentials.password) {
                    throw new Error("Missing username or password");
                }
                const user = await User.findUserByEmail(credentials.email);
                if (!user || !user.user_id) {
                    logger.warn("User not found with email", credentials.email);
                    throw new Error("User not found");
                }
                if (!user) { return null; }
                if (user.two_factor_enabled) {
                    if (!credentials.twoFactorCode) {
                        logger.warn("2FA code required for email", credentials.email);
                        return null;
                    }
                    if (!user.two_factor_secret) {
                        logger.warn("2FA secret not found for email", credentials.email);
                        return null;
                    }
                    const isValid2FA = await verifyAuthenticator(credentials.twoFactorCode, user.two_factor_secret);
                    if (!isValid2FA) {
                        logger.warn("Invalid 2FA code for email", credentials.email);
                        return null;
                    }
                }

                try {
                    // Get token from Keycloak
                    const tokenData = await getKeycloakToken(user.username, credentials.password);
                    logger.info("Token Data:", tokenData);
                    if (!tokenData || !tokenData.access_token) {
                        return null;
                    }
                    const tokenInfo = decodeToken(tokenData.access_token);
                    if (!tokenInfo) {
                        return null;
                    }

                    if (tokenInfo.email !== credentials.email) {
                        return null;
                    }
                    return {
                        id: user.user_id.toString(),
                        email: user.email,
                        username: user.username,
                        image: user.image || '/image/avatar-purple-big.png',
                        name: `${user.first_name} ${user.last_name}`,
                        proToken: tokenData.access_token,
                        tenant: user.tenant
                    };
                } catch (error) {
                    logger.error("Failed to authenticate with Keycloak:", error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: '/auth/signin',
    },
    session: {
        strategy: "jwt",
        maxAge: NEXTAUTH_SESSION_EXPIRES,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const extendedUser = user as ExtendedUser;
                token.id = extendedUser.id;
                token.email = extendedUser.email;
                token.name = extendedUser.name;
                token.username = extendedUser.username;
                token.image = extendedUser.image;
                token.proToken = extendedUser.proToken;
                token.tenant = extendedUser.tenant;
            }

            // On subsequent requests, validate the token
            const validatedUser = await validateUser(token);
            if (!validatedUser) {
                // If validation fails, return a token that will cause the session to be invalid
                return { ...token, error: "TokenValidationError" };
            }

            return {
                ...token,
                name: validatedUser.first_name + " " + validatedUser.last_name,
                email: validatedUser.email,
                tenant: validatedUser.tenant,
            };
        },
        async session({ session, token }) {
            if (token.error === "TokenValidationError") {
                // If there was an error during token validation, return a special session
                return { expires: "0" };
            }
          
            logger.debug("Session Token:", token);
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email || '';
                session.user.name = token.name || '';
                session.user.username = token.username as string;
                session.user.image = token.image as string;
                session.user.proToken = token.proToken as string;
                session.user.tenant = token.tenant as string;
            }
            logger.trace("Session Object:", session);
            return session;
        },
    },
};

async function validateUser(token: any) {
    try {
        // Fetch the user from the database
        const user = await User.findUserByUsername(token.username);

        // Check if the user exists and the ID matches
        if (!user || user.user_id !== token.id) {
            logger.warn(`User validation failed for username: ${token.username}`);
            return null;
        }
        // Additional checks can be added here
        // For example, check if the user is still active, if their role hasn't changed, etc.

        return user;
    } catch (error) {
        logger.error("Error validating user:", error);
        return null;
    }
}
