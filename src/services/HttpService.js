import axiosInstance from './AxiosInterceptor.js';

export default class HttpService {
  async getData(url) {
    // tiempo de retraso
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    return axiosInstance.get(url).then((response) => {
      // console.log('Response getData ------------------------:');
      // console.log(JSON.stringify(response, null, 2));
      return response;
    });
  }

  async postData(url, data) {
    // console.log('Data createData ------------------------:');
    // console.log(JSON.stringify(data, null, 2));

    return axiosInstance.post(url, data).then((response) => {
      // console.log('Response createData ------------------------:');
      // console.log(JSON.stringify(response, null, 2));
      return response;
    });
  }

  async postFormData(url, data) {
    return axiosInstance.post(url, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((response) => {
      // console.log('Response createFormData ------------------------:');
      // console.log(JSON.stringify(response, null, 2));
      return response;
    });
  }

  async putData(url, id, data) {
    return axiosInstance.put(`${url}/${id}`, data).then((response) => {
      // console.log('Response updateData ------------------------:');
      // console.log(JSON.stringify(response, null, 2));
      return response;
    });
  }

  async putFormData(url, id, data) {
    return axiosInstance.put(`${url}/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((response) => {
      // console.log('Response updateFormData ------------------------:');
      // console.log(JSON.stringify(response, null, 2));
      return response;
    });
  }

  async deleteData(url, id) {
    return axiosInstance.delete(`${url}/${id}`).then((response) => {
      // console.log('Response deleteData ------------------------:');
      // console.log(JSON.stringify(response, null, 2));
      return response;
    });
  }
}
