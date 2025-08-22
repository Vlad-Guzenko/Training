import { JSX, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const loc = useLocation();

  useEffect(() => onAuthStateChanged(auth, (u) => setAuthed(!!u)), []);
  if (authed === null) return null; // можно вернуть лоадер

  return authed ? (
    children
  ) : (
    <Navigate to="/settings" replace state={{ from: loc.pathname }} />
  );
}
