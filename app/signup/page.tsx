"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Briefcase, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSignUp() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setEmailSent(true);
    setLoading(false);
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Check your email
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-semibold text-gray-900 mb-6">{email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-medium text-primary">Job Tracker</span>
        </Link>

        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Create account
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Start tracking your applications
        </p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Email
            </Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-gray-200 focus-visible:ring-primary"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Password
            </Label>
            <Input
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
              className="h-11 border-gray-200 focus-visible:ring-primary"
            />
          </div>
        </div>

        <Button
          className="w-full h-11 mt-6 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg"
          onClick={handleSignUp}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-primary hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
