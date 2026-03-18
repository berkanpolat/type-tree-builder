import React, { Component, type ReactNode } from "react";
import { reportReactError } from "@/lib/error-tracker";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportReactError(error, errorInfo.componentStack || "", window.location.href);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="text-center max-w-md space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">
              Beklenmeyen bir hata oluştu
            </h2>
            <p className="text-sm text-muted-foreground">
              Hata ekibimize otomatik olarak bildirildi. Lütfen sayfayı yenilemeyi deneyin.
            </p>
            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <summary className="cursor-pointer font-medium mb-1">Hata Detayı</summary>
                <code className="block whitespace-pre-wrap break-all mt-1">{this.state.error.message}</code>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
