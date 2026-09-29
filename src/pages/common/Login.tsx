import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/api"

export default function Login() {
  const signIn = () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })
  return (
    <main className="grid min-h-svh place-items-center bg-sidebar p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Adi Scholar</CardTitle>
          <CardDescription>
            Fellowships and scholarships for Scheduled Tribe students, Ministry of Tribal Affairs (NFST, NOS).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button size="lg" onClick={signIn}>
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground">
            Students and officials use the same sign-in. Officials get their role from the scheme administrator.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
