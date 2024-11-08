import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt"

export async function authorizationMiddleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // No token found, redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  if (token.error === "TokenValidationError") {
    // Token validation failed, redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Set the tenant based on the user's token
  // Assuming the token contains a 'tenant' field. Adjust this if your token structure is different.
  if (token && token.tenant) {
    console.log('token: ' + token.tenant);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-tenant-id', token.tenant.toString());

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } else {
    // Handle the case where tenant is not in the token
    console.error('Tenant information not found in the token');
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
}

function getResourceTypeFromUrl(url: string): string {
  // TODO: Implement logic to extract resource type from URL
  return url.split('/')[1];
}

function getActionFromMethod(method: string): string {
  // TODO: Implement logic to map HTTP method to action
  return method;
}
