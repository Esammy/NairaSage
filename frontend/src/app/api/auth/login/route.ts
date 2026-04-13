import { NextResponse } from 'next/server';
import axios from 'axios';

const DJANGO_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the credentials to Django backend
    const response = await axios.post(`${DJANGO_URL}/auth/token/`, body);
    
    const { access, refresh } = response.data;
    
    // Create a Next.js Response
    const nextResponse = NextResponse.json({ success: true }, { status: 200 });
    
    // Set HTTP-Only Cookies for bank-grade security
    // This makes the tokens completely invisible to client-side JS (avoiding XSS)
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
  } catch (error: any) {
    console.error("Login Proxy Error:", error.response?.data || error.message);
    const status = error.response?.status || 401;
    return NextResponse.json({ error: 'Invalid credentials' }, { status });
  }
}
