// // src/services/eventsApi.ts
// import axios from 'axios';

// const API_URL = 'http://localhost:5001/api/events';

// export const fetchAllEvents = async () => {
//   try {
//     const response = await axios.get(API_URL + '/getEvents', {
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem('token')}`
//       }
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching events:', error);
//     throw error;
//   }
// };

// export const createEvent = async (eventData: any) => {
//   try {
//     const response = await axios.post(API_URL + '/createEvent', eventData, {
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem('token')}`
//       }
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error creating event:', error);
//     throw error;
//   }
// };

// // Add other CRUD operations as needed



import axios from 'axios';

const API_URL = 'http://localhost:5001/api/events';

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

// ✅ GET all events
export const fetchAllEvents = async () => {
  const response = await axios.get(`${API_URL}/getEvents`, authHeaders());
  return response.data;
};

// ✅ GET single event by ID
export const fetchEventById = async (id: string) => {
  const response = await axios.get(`${API_URL}/getEventById?id=${id}`, authHeaders());
  return response.data;
};

// ✅ CREATE new event
export const createEvent = async (eventData: any) => {
  const response = await axios.post(`${API_URL}/createEvent`, eventData, authHeaders());
  return response.data;
};

// ✅ UPDATE existing event
export const updateEvent = async (eventData: any) => {
  const response = await axios.put(`${API_URL}/updateEvent`, eventData, authHeaders());
  return response.data;
};

// ✅ DELETE an event
export const deleteEvent = async (id: string) => {
  const response = await axios.delete(`${API_URL}/deleteEvent`, {
    ...authHeaders(),
    data: { id }, // Axios requires `data` field in DELETE payload
  });
  return response.data;
};
