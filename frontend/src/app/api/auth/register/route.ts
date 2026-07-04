import { NextResponse } from 'next/server';
import axios from 'axios';

const DJANGO_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Forward the registration logic to Django
    await axios.post(`${DJANGO_URL}/auth/register/`, body);
    
    // 2. Automatically log the user in immediately after successful registration
    const loginResponse = await axios.post(`${DJANGO_URL}/auth/token/`, {
      email: body.email,
      password: body.password
    });
    
    const { access, refresh } = loginResponse.data;
    
    // 3. Issue the secure cookies
    const nextResponse = NextResponse.json({ success: true, redirect: '/onboard' }, { status: 200 });
    
    nextResponse.cookies.set('access_token', access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
    
    nextResponse.cookies.set('refresh_token', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return nextResponse;
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number }; message?: string };
    console.error("Register Proxy Error:", err.response?.data || err.message);
    const status = err.response?.status || 400;
    return NextResponse.json({ error: err.response?.data || 'Failed to register' }, { status });
  }
}
