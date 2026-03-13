import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
import { AuthProvider } from "@/contexts/AuthContext"; // Add this import
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { FinancialDataProvider } from "@/contexts/FinancialDataContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider> {/* Add AuthProvider here */}
          <UserProfileProvider>
            <GoalsProvider>
              <FinancialDataProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </FinancialDataProvider>
            </GoalsProvider>
          </UserProfileProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;