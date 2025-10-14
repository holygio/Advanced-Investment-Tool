import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

export default function AccessGateway() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/credentials.json");
      const data = await response.json();

      if (password.trim() === data.password && accessCode.trim() === data.access_code) {
        // Store authentication state
        sessionStorage.setItem("auth", "true");
        // Redirect to dashboard
        setLocation("/dashboard");
      } else {
        setError("Invalid password or access code.");
      }
    } catch (err) {
      setError("Failed to verify credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <Card className="p-8 shadow-lg border border-gray-200">
          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <div className="flex items-center justify-center gap-3">
              <TrendingUp className="h-8 w-8" style={{ color: "#D4AF37" }} />
              <h1 className="text-2xl font-bold text-gray-900">
                Advanced Investments Lab
              </h1>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Access Gateway
            </h2>
            <p className="text-base text-gray-600">
              Enter your access credentials to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-gray-300 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-code" className="text-gray-700">
                Access Code
              </Label>
              <Input
                id="access-code"
                type="text"
                placeholder="Enter access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="border-gray-300 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
                data-testid="input-access-code"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-600 text-sm text-center" data-testid="text-error">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-white font-semibold transition-colors hover:opacity-90 active:opacity-95"
              style={{
                backgroundColor: "#D4AF37",
                borderColor: "#D4AF37"
              }}
              disabled={isLoading}
              data-testid="button-enter-lab"
            >
              {isLoading ? "Verifying..." : "Enter Lab"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              You received these credentials after payment.
            </p>
            <p className="text-sm text-gray-500">
              Need help? Contact Giovanni.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
