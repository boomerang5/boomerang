"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString(); //Toma el valor del campo email
  const password = formData.get("password")?.toString(); //Toma el valor del campo password
  const supabase = await createClient(); //Crea una instancia del cliente Supabase
  const origin = (await headers()).get("origin"); //Obtiene el origen (http://localhost:3000) de la solicitud, que se usará para redirigir al usuario después de la verificación del correo electrónico

  // Verifica si el email y la contraseña no sean cadenas vacías
  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  // Registro de un usuario que posteriormente será autentificado
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`, // para confirmar el correo electrónico
    },
  });

  // Si hay un error, se redirige al usuario a la página de registro con un mensaje de error
  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else { // Si no hay error, se redirige al usuario a la página de inicio de sesión con un mensaje de éxito
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

// INICIO DE SESIÓN CON PASSWORD
export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin"); 
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

//Registrarse con mail
export const signUpStep1Action = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();

  if (!email || !password) {
    return encodedRedirect("error", "/sign-up", "Email y contraseña requeridos.");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback", // cambia a tu dominio real en prod
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-up", error.message);
  }

  // ✅ Solo mostramos mensaje para que verifique su correo
  return redirect("/sign-up/verify-email");
};


//Completar formulario perfil
export const completeProfileAction = async (formData: FormData) => {
  const supabase = await createClient();

  const user_id = formData.get("userId")?.toString();
  const nombre = formData.get("nombre")?.toString();
  const apellido = formData.get("apellido")?.toString();
  const apodo = formData.get("apodo")?.toString();
  const idioma = 1;
  const fecha_nacimiento = formData.get("fecha_nacimiento")?.toString(); // 👈
  const genero = formData.get("sexo")?.toString(); // 👈

  if (!user_id || !nombre || !apellido || !apodo || !fecha_nacimiento || !genero) {
    return encodedRedirect("error", "/sign-up", "Faltan datos del perfil.");
  }

  const { error } = await supabase.rpc("create_usuario_profile", {
    p_nombre: nombre,
    p_apellido: apellido,
    p_idioma: idioma,
    p_apodo: apodo,
    p_user_id: user_id,
    p_fec_nacimiento: fecha_nacimiento,
    p_genero: genero,
  });

  if (error) {
    console.error("❌ Error en RPC create_usuario_profile:", error);
    return encodedRedirect("error", "/sign-up", error.message || "Error al guardar perfil.");
  }

  return redirect("/sign-in");
};



