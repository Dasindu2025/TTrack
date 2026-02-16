import { jsonError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    const response = jsonOk({ success: true });

    const isSecure = process.env.NODE_ENV === "production";
    const cookieNames = [
      isSecure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      isSecure ? "__Secure-authjs.session-token" : "authjs.session-token"
    ];

    for (const cookieName of cookieNames) {
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        expires: new Date(0),
        path: "/"
      });
    }

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
