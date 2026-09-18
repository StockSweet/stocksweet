import { API_BASE_URL } from "./config.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const emailError = document.getElementById("emailError");
const senhaError = document.getElementById("senhaError");
const submitBtn = document.getElementById("submitBtn");
const alertBox = document.getElementById("alert");
const alertMessage = document.getElementById("alertMessage");
const toggleSenhaBtn = document.getElementById("toggleSenha");
const formWrap = document.querySelector(".auth__form-wrap");
const successState = document.getElementById("successState");
const successName = document.getElementById("successName");

const TOKEN_KEY = "stocksweet.token";
const USER_KEY = "stocksweet.usuario";

function setFieldError(input, errorEl, message) {
  input.classList.toggle("is-invalid", Boolean(message));
  errorEl.textContent = message ?? "";
}

function validate() {
  let valid = true;

  if (!emailInput.value.trim()) {
    setFieldError(emailInput, emailError, "Informe seu e-mail.");
    valid = false;
  } else if (!emailInput.checkValidity()) {
    setFieldError(emailInput, emailError, "Digite um e-mail válido.");
    valid = false;
  } else {
    setFieldError(emailInput, emailError, "");
  }

  if (!senhaInput.value) {
    setFieldError(senhaInput, senhaError, "Informe sua senha.");
    valid = false;
  } else if (senhaInput.value.length < 8) {
    setFieldError(senhaInput, senhaError, "A senha deve ter no mínimo 8 caracteres.");
    valid = false;
  } else {
    setFieldError(senhaInput, senhaError, "");
  }

  return valid;
}

function hideAlert() {
  alertBox.hidden = true;
}

function showAlert(message) {
  alertMessage.textContent = message;
  alertBox.hidden = false;
  alertBox.classList.remove("shake");
  // força reflow para reiniciar a animação em erros consecutivos
  void alertBox.offsetWidth;
  alertBox.classList.add("shake");
}

function setLoading(isLoading) {
  submitBtn.classList.toggle("is-loading", isLoading);
  submitBtn.disabled = isLoading;
  emailInput.disabled = isLoading;
  senhaInput.disabled = isLoading;
}

async function login(email, senha) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message ?? "Não foi possível entrar. Tente novamente.");
  }

  return data.resposta;
}

function showSuccess(usuario, manterConectado) {
  const storage = manterConectado ? window.localStorage : window.sessionStorage;
  storage.setItem(TOKEN_KEY, usuario.token);
  storage.setItem(USER_KEY, JSON.stringify(usuario.usuario));

  successName.textContent = usuario.usuario?.nome ?? usuario.usuario?.email ?? "usuário";
  formWrap.classList.add("is-hidden");
  successState.hidden = false;
  requestAnimationFrame(() => successState.classList.add("is-visible"));
}

toggleSenhaBtn.addEventListener("click", () => {
  const isPassword = senhaInput.type === "password";
  senhaInput.type = isPassword ? "text" : "password";
  toggleSenhaBtn.setAttribute("aria-pressed", String(isPassword));
  toggleSenhaBtn.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
  toggleSenhaBtn.querySelector(".icon-eye").hidden = isPassword;
  toggleSenhaBtn.querySelector(".icon-eye-off").hidden = !isPassword;
});

[emailInput, senhaInput].forEach((input) => {
  input.addEventListener("input", () => {
    hideAlert();
    const errorEl = input === emailInput ? emailError : senhaError;
    setFieldError(input, errorEl, "");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAlert();

  if (!validate()) return;

  setLoading(true);

  try {
    const resposta = await login(emailInput.value.trim(), senhaInput.value);
    const manterConectado = document.getElementById("manterConectado").checked;
    showSuccess(resposta, manterConectado);
  } catch (error) {
    showAlert(error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente.");
  } finally {
    setLoading(false);
  }
});

document.getElementById("forgotLink").addEventListener("click", (event) => {
  event.preventDefault();
  showAlert("Fale com o gestor da sua confeitaria para redefinir sua senha.");
});

document.getElementById("registerLink").addEventListener("click", (event) => {
  event.preventDefault();
});

// Leve parallax da ilustração ao mover o mouse sobre o painel esquerdo.
const panel = document.getElementById("authPanel");
const illustration = document.getElementById("illustration");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (panel && illustration && !prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
  const MAX_TILT = 10;

  panel.addEventListener("pointermove", (event) => {
    const rect = panel.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    illustration.style.setProperty("--tilt-x", `${relX * MAX_TILT * -1}px`);
    illustration.style.setProperty("--tilt-y", `${relY * MAX_TILT * -1}px`);
  });

  panel.addEventListener("pointerleave", () => {
    illustration.style.setProperty("--tilt-x", "0px");
    illustration.style.setProperty("--tilt-y", "0px");
  });
}
