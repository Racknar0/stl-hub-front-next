import Swal from 'sweetalert2'

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const getScrollPosition = () => {
  if (!isBrowser) return { x: 0, y: 0 };
  return {
    x: window.pageXOffset ?? window.scrollX ?? 0,
    y: window.pageYOffset ?? window.scrollY ?? 0,
  };
};

const restoreScrollPosition = (pos) => {
  if (!isBrowser) return;
  window.scrollTo(pos.x, pos.y);
};

const fireNoScroll = async (options = {}) => {
  // En SSR o entornos sin window/document, no tocamos nada.
  if (!isBrowser) return Swal.fire(options);

  const initialPos = getScrollPosition();
  const restore = () => {
    // Doble RAF para evitar saltos por focus/layout.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => restoreScrollPosition(initialPos));
    });
  };

  const userDidOpen = options.didOpen;
  const userWillClose = options.willClose;
  const userDidClose = options.didClose;

  // `heightAuto: false` y `returnFocus: false` evitan varios saltos de scroll conocidos.
  const mergedOptions = {
    ...options,
    heightAuto: false,
    returnFocus: false,
    didOpen: (popup) => {
      restore();
      if (typeof userDidOpen === 'function') userDidOpen(popup);
    },
    willClose: (popup) => {
      restore();
      if (typeof userWillClose === 'function') userWillClose(popup);
    },
    didClose: () => {
      restore();
      if (typeof userDidClose === 'function') userDidClose();
    },
  };

  try {
    const result = await Swal.fire(mergedOptions);
    restore();
    return result;
  } finally {
    restore();
  }
};

// Helper genérico para casos que no cubren success/error/confirm/select.
export const fireAlert = async (options) => fireNoScroll(options);

export const successAlert = async (title = 'Success!', message = 'La operación se ha realizado con éxito') => {
  await fireNoScroll({
    title: title,
    text: message,
    icon: 'success',
    confirmButtonText: 'Ok',
    zIndex: 2000,
  })
}

export const errorAlert = async (title = 'Error!', message = 'Un error ha ocurrido') => {
  await fireNoScroll({
    title: title,
    text: message,
    icon: 'error',
    confirmButtonText: 'Ok',
    zIndex: 2000,
  })
}

export const warningAlert = async (title = 'Warning!', message = 'Advertencia') => {
  await fireNoScroll({
        title: title,
        text: message,
        icon: 'warning',
        confirmButtonText: 'Ok',
        zIndex: 2000,
    })
    }

export const timerAlert = async (title = 'Success!', message = 'La operación se ha realizado con éxito', timer = 2000) => {
  await fireNoScroll({
    title: title,
    text: message,
    icon: 'success',
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    zIndex: 2000,
  })
}

export const confirmAlert = async (
  title = '¿Estás seguro?',
  message = 'Confirma para continuar',
  confirmText = 'Sí',
  cancelText = 'Cancelar',
  icon = 'question'
) => {
  const result = await fireNoScroll({
    title,
    text: message,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    zIndex: 2000,
  })
  return result.isConfirmed
}

// Selector simple con SweetAlert (por ejemplo: 3, 6, 12 meses)
export const selectAlert = async (
  title = 'Selecciona una opción',
  message = '',
  options = {}, // { value: label }
  confirmText = 'Aceptar',
  cancelText = 'Cancelar'
) => {
  const result = await fireNoScroll({
    title,
    text: message,
    input: 'select',
    inputOptions: options,
    inputPlaceholder: 'Selecciona…',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    zIndex: 2000,
    inputValidator: (value) => {
      if (!value) return 'Selecciona una opción';
      return undefined;
    },
  })
  return result.isConfirmed ? result.value : null;
}