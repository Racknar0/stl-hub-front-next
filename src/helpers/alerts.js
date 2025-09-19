import Swal from 'sweetalert2'

export const successAlert = async (title = 'Success!', message = 'La operación se ha realizado con éxito') => {
  await Swal.fire({
    title: title,
    text: message,
    icon: 'success',
    confirmButtonText: 'Ok',
    zIndex: 2000,
  })
}

export const errorAlert = async (title = 'Error!', message = 'Un error ha ocurrido') => {
  await Swal.fire({
    title: title,
    text: message,
    icon: 'error',
    confirmButtonText: 'Ok',
    zIndex: 2000,
  })
}

export const warningAlert = async (title = 'Warning!', message = 'Advertencia') => {
    await Swal.fire({
        title: title,
        text: message,
        icon: 'warning',
        confirmButtonText: 'Ok',
        zIndex: 2000,
    })
    }

export const timerAlert = async (title = 'Success!', message = 'La operación se ha realizado con éxito', timer = 2000) => {
  await Swal.fire({
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
  const result = await Swal.fire({
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