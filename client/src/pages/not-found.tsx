import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground">
            The module you're looking for doesn't exist in this interactive lab.
          </p>
        </div>
        
        <Link href="/">
          <Button data-testid="button-home">
            <Home className="h-4 w-4 mr-2" />
            Back to Portfolio Builder
          </Button>
        </Link>
      </div>
    </div>
  );
}
