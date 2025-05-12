// // ../add/add.test.tsx -not required
// import React from 'react';
// import {
//   render,
//   fireEvent,
//   waitFor,
// } from '@testing-library/react-native';
// import { Alert, Modal } from 'react-native';
// import AddItemScreen from '../add'; // Adjust the import path if necessary
// import { supabase } from '@/lib/supabase';
// import * as ImagePicker from 'expo-image-picker';
// import * as FileSystem from 'expo-file-system';
// import * as Notifications from 'expo-notifications';

// // Mock the Supabase client setup *before* any imports that use it
// jest.mock('@/lib/supabase', () => ({
//   supabase: {
//     auth: {
//       getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@example.com' } }, error: null }),
//     },
//     from: jest.fn().mockImplementation((tableName) => {
//       let result: any = {};
//       if (tableName === 'items') {
//         result = {
//           insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, title: 'Test Item' }], error: null }) }),
//         };
//       } else if (tableName === 'profiles') {
//         result = {
//           update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
//         };
//       } else if (tableName === 'push_tokens') {
//         result = {
//           upsert: jest.fn().mockResolvedValue({ error: null }),
//           select: jest.fn().mockResolvedValue({ data: [{ push_token: 'token1' }, { push_token: 'token2' }], error: null }),
//           delete: jest.fn().mockResolvedValue({ error: null }),
//           not: jest.fn().mockReturnThis(),
//           eq: jest.fn().mockReturnThis(),
//         };
//       } else {
//         result = {
//           insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, title: 'Test Item' }], error: null }) }),
//           update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
//           delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
//           select: jest.fn().mockResolvedValue({ data: [{ push_token: 'token1' }, { push_token: 'token2' }], error: null }),
//           not: jest.fn().mockReturnThis(),
//           eq: jest.fn().mockReturnThis(),
//         };
//       }
//       return result;
//     }),
//     storage: {
//       from: jest.fn().mockReturnValue({
//         upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
//         getPublicUrl: jest.fn().mockResolvedValue({ data: { publicUrl: 'test-image-url' } }),
//       }),
//     },
//   },
// }));
// jest.mock('expo-image-picker');
// jest.mock('expo-file-system');
// jest.mock('expo-notifications');
// jest.mock('expo-router', () => ({
//   useRouter: () => ({
//     push: jest.fn(),
//     replace: jest.fn(),
//   }),
// }));

// // Mock global.Buffer if it's used
// global.Buffer = global.Buffer || require('buffer').Buffer;

// describe('AddItemScreen', () => {
//   let mockLaunchImageLibraryAsync: jest.Mock;
//   let mockLaunchCameraAsync: jest.Mock;
//   let mockRequestMediaLibraryPermissionsAsync: jest.Mock;
//   let mockRequestCameraPermissionsAsync: jest.Mock;
//   let mockGetPermissionsAsync: jest.Mock;
//   let mockRequestPermissionsAsync: jest.Mock;
//   let mockGetExpoPushTokenAsync: jest.Mock;

//   beforeEach(() => {
//     // Reset all mocks before each test
//     (supabase.auth.getUser as jest.Mock).mockClear();
//     (supabase.from as jest.Mock).mockClear();
//     (supabase.storage.from as jest.Mock).mockClear();

//     (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@example.com' } }, error: null });
//     (supabase.from as jest.Mock).mockImplementation((tableName) => {
//       let result: any = {};
//       if (tableName === 'items') {
//         result = {
//           insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, title: 'Test Item' }], error: null }) }),
//         };
//       } else if (tableName === 'profiles') {
//         result = {
//           update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
//         };
//       } else if (tableName === 'push_tokens') {
//         result = {
//           upsert: jest.fn().mockResolvedValue({ error: null }),
//           select: jest.fn().mockResolvedValue({ data: [{ push_token: 'token1' }, { push_token: 'token2' }], error: null }),
//           delete: jest.fn().mockResolvedValue({ error: null }),
//           not: jest.fn().mockReturnThis(),
//           eq: jest.fn().mockReturnThis(),
//         };
//       } else {
//         result = {
//           insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, title: 'Test Item' }], error: null }) }),
//           update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
//           delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
//           select: jest.fn().mockResolvedValue({ data: [{ push_token: 'token1' }, { push_token: 'token2' }], error: null }),
//           not: jest.fn().mockReturnThis(),
//           eq: jest.fn().mockReturnThis(),
//         };
//       }
//       return result;
//     });
//     (supabase.storage.from as jest.Mock).mockReturnValue({
//       upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
//       getPublicUrl: jest.fn().mockResolvedValue({ data: { publicUrl: 'test-image-url' } }),
//     });
//     (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64-encoded-image');
//     mockLaunchImageLibraryAsync = jest.fn().mockResolvedValue({ assets: [{ uri: 'mocked-uri' }], canceled: false });
//     (ImagePicker.launchImageLibraryAsync as jest.Mock).mockImplementation(() => mockLaunchImageLibraryAsync());
//     mockLaunchCameraAsync = jest.fn().mockResolvedValue({ assets: [{ uri: 'mocked-camera-uri' }], canceled: false });
//     (ImagePicker.launchCameraAsync as jest.Mock).mockImplementation(() => mockLaunchCameraAsync());
//     mockRequestMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
//     (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockImplementation(() => mockRequestMediaLibraryPermissionsAsync());
//     mockRequestCameraPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
//     (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockImplementation(() => mockRequestCameraPermissionsAsync());
//     mockGetPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
//     (Notifications.getPermissionsAsync as jest.Mock).mockImplementation(() => mockGetPermissionsAsync());
//     const mockRequestPermissionsAsyncResult = { status: 'granted' };
//     mockRequestPermissionsAsync = jest.fn().mockResolvedValue(mockRequestPermissionsAsyncResult);
//     (Notifications.requestPermissionsAsync as jest.Mock).mockImplementation(() => mockRequestPermissionsAsync());
//     mockGetExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: 'mock-push-token' });
//     (Notifications.getExpoPushTokenAsync as jest.Mock).mockImplementation(() => mockGetExpoPushTokenAsync());
//   });

//   it('renders correctly', () => {
//     const { getByText, getByPlaceholderText } = render(<AddItemScreen />);
//     expect(getByText('Add New Item')).toBeDefined();
//     expect(getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard')).toBeDefined();
//     expect(getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.')).toBeDefined();
//     expect(getByText('Lost Item')).toBeDefined();
//     expect(getByText('Found Item')).toBeDefined();
//     expect(getByText('Post Item')).toBeDefined();
//     expect(getByText('Add Photo')).toBeDefined();
//   });

//   it('updates title and description on input change', () => {
//     const { getByPlaceholderText } = render(<AddItemScreen />);
//     const titleInput = getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard');
//     const descriptionInput = getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.');

//     fireEvent.changeText(titleInput, 'My Lost Item');
//     fireEvent.changeText(descriptionInput, 'Details about the lost item.');

//     // No direct way to check state with RTL, but we can check if the mock handleSubmit would receive these values
//   });

//   it('toggles between "lost" and "found"', () => {
//     const { getByText } = render(<AddItemScreen />);
//     const lostButton = getByText('Lost Item');
//     const foundButton = getByText('Found Item');

//     // You might need to adjust these expectations based on how your component styles the active button.
//     // For example, if the color changes, you'd check for that.
//     expect(getByText('Lost Item').props.style[1]?.color || getByText('Lost Item').props.style?.color).not.toBeUndefined();
//     expect(getByText('Found Item').props.style[1]?.color || getByText('Found Item').props.style?.color).toBeUndefined();

//     fireEvent.press(foundButton);
//     expect(getByText('Lost Item').props.style[1]?.color || getByText('Lost Item').props.style?.color).toBeUndefined();
//     expect(getByText('Found Item').props.style[1]?.color || getByText('Found Item').props.style?.color).not.toBeUndefined();

//     fireEvent.press(lostButton);
//     expect(getByText('Lost Item').props.style[1]?.color || getByText('Lost Item').props.style?.color).not.toBeUndefined();
//     expect(getByText('Found Item').props.style[1]?.color || getByText('Found Item').props.style?.color).toBeUndefined();
//   });

//   it('opens image picker modal when "Add Photo" is pressed', async () => {
//     const { getByText, queryByTestId } = render(<AddItemScreen />);
//     fireEvent.press(getByText('Add Photo'));
//     // We expect a Modal to be present after pressing "Add Photo"
//     await waitFor(() => expect(queryByTestId('image-picker-modal')).toBeDefined());
//     // You might need to ensure the modal is visible in your component for this testID to be present.
//   });

//   it('calls handleImagePick when "Choose from Library" is pressed', async () => {
//     const { getByText } = render(<AddItemScreen />);
//     fireEvent.press(getByText('Add Photo'));
//     // Ensure "Choose from Library" is within the rendered modal
//     await waitFor(() => expect(getByText('Choose from Library')).toBeDefined());
//     fireEvent.press(getByText('Choose from Library'));
//     await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
//     await waitFor(() => expect(supabase.storage.from).toHaveBeenCalledWith('item-images'));
//     await waitFor(() => expect(supabase.storage.from('item-images').upload).toHaveBeenCalled());
//     await waitFor(() => expect(supabase.storage.from('item-images').getPublicUrl).toHaveBeenCalled());
//     // You might want to check if the setImage state is updated, but it's harder to directly test state.
//   });

//   it('calls handleTakePhoto when "Take Photo" is pressed', async () => {
//     const { getByText } = render(<AddItemScreen />);
//     fireEvent.press(getByText('Add Photo'));
//     // Ensure "Take Photo" is within the rendered modal
//     await waitFor(() => expect(getByText('Take Photo')).toBeDefined());
//     fireEvent.press(getByText('Take Photo'));
//     await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
//     await waitFor(() => expect(supabase.storage.from).toHaveBeenCalledWith('item-images'));
//     await waitFor(() => expect(supabase.storage.from('item-images').upload).toHaveBeenCalled());
//     await waitFor(() => expect(supabase.storage.from('item-images').getPublicUrl).toHaveBeenCalled());
//   });

//   it('closes the image picker modal when "Cancel" is pressed', () => {
//     const { getByText, queryByTestId } = render(<AddItemScreen />);
//     fireEvent.press(getByText('Add Photo'));
//     expect(queryByTestId('image-picker-modal')).toBeDefined();
//     fireEvent.press(getByText('Cancel'));
//     expect(queryByTestId('image-picker-modal')).toBeNull();
//   });

//   it('submits the form data when "Post Item" is pressed', async () => {
//     const { getByText, getByPlaceholderText } = render(<AddItemScreen />);
//     const titleInput = getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard');
//     const descriptionInput = getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.');
//     const postButton = getByText('Post Item');

//     fireEvent.changeText(titleInput, 'Test Lost Item');
//     fireEvent.changeText(descriptionInput, 'Test description.');
//     fireEvent.press(postButton);

//     await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalled());
//     await waitFor(() => expect(supabase.from('items').insert).toHaveBeenCalledWith({
//       title: 'Test Lost Item',
//       description: 'Test description.',
//       type: 'lost',
//       image_url: 'test-image-url',
//       user_id: 'test-user-id',
//       user_email: 'test@example.com',
//     }));
//     await waitFor(() => expect(global.fetch).toHaveBeenCalled()); // For sendNotification

//     const { mock } = require('expo-router').useRouter();
//     await waitFor(() => expect(mock.replace).toHaveBeenCalledWith('/'));
//   });

//   it('shows alert if title or description is missing', async () => {
//     const { getByText, getByPlaceholderText } = render(<AddItemScreen />);
//     const postButton = getByText('Post Item');
//     const mockAlert = jest.spyOn(Alert, 'alert');

//     // Missing title
//     fireEvent.press(postButton);
//     await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Missing Information', 'Please fill in both title and description.'));
//     mockAlert.mockClear();

//     // Missing description
//     fireEvent.changeText(getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard'), 'Some Title');
//     fireEvent.press(postButton);
//     await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Missing Information', 'Please fill in both title and description.'));
//     mockAlert.mockClear();

//     // Both present, should not trigger this alert immediately
//     fireEvent.changeText(getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.'), 'Some Description');
//     fireEvent.press(postButton);
//     await waitFor(() => expect(mockAlert).not.toHaveBeenCalledWith('Missing Information', 'Please fill in both title and description.'));
//     mockAlert.mockRestore();
//   });

//   it('shows loading indicator during submission', async () => {
//     (supabase.from as jest.Mock).mockReturnValue({
//       insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(new Promise(() => {})) }),
//     });
//     const { getByText, getByPlaceholderText, queryByTestId } = render(<AddItemScreen />);
//     const titleInput = getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard');
//     const descriptionInput = getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.');
//     const postButton = getByText('Post Item');

//     fireEvent.changeText(titleInput, 'Loading Item');
//     fireEvent.changeText(descriptionInput, 'Loading description.');
//     fireEvent.press(postButton);

//     expect(getByText('Posting...')).toBeDefined();

//     // Optionally, you could add a setTimeout and then resolve the promise to check if loading disappears.
//   });

//   it('handles image uploading state', async () => {
//     mockLaunchImageLibraryAsync.mockReturnValueOnce(new Promise(() => {})); // Simulate ongoing image pick
//     const { getByText } = render(<AddItemScreen />);
//     fireEvent.press(getByText('Add Photo'));
//     await waitFor(() => expect(getByText('Choose from Library')).toBeDefined());
//     fireEvent.press(getByText('Choose from Library'));
//     expect(getByText('Uploading Image...')).toBeDefined();

//     // To test the completion, you'd need to resolve the promise.
//   });
// });
import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import AddItemScreen from '../add';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Buffer } from 'buffer';


// --- MOCKS ---
let mockSupabaseAuthGetUser: jest.Mock;
let mockSupabaseFrom: jest.Mock;
let mockSupabaseStorageFrom: jest.Mock;
let mockItemsInsert: jest.Mock;
let mockItemsSelectAfterInsert: jest.Mock;
let mockProfilesUpdate: jest.Mock;
let mockProfilesUpdateEq: jest.Mock;
let mockPushTokensUpsert: jest.Mock;
let mockPushTokensSelect: jest.Mock;
let mockPushTokensSelectNot: jest.Mock;
// let mockPushTokensSelectNotIs: jest.Mock; // Not needed, .not() is the terminal call in this chain
let mockPushTokensDelete: jest.Mock;
let mockPushTokensDeleteEq: jest.Mock;
let mockStorageUpload: jest.Mock;
let mockStorageGetPublicUrl: jest.Mock;

jest.mock('@/lib/supabase', () => {
  mockSupabaseAuthGetUser = jest.fn();
  mockSupabaseFrom = jest.fn();
  mockSupabaseStorageFrom = jest.fn();
  mockItemsInsert = jest.fn();
  mockItemsSelectAfterInsert = jest.fn();
  mockProfilesUpdate = jest.fn();
  mockProfilesUpdateEq = jest.fn();
  mockPushTokensUpsert = jest.fn();
  mockPushTokensSelect = jest.fn();
  mockPushTokensSelectNot = jest.fn(); // This mock will be called by .not(...)
  mockPushTokensDelete = jest.fn();
  mockPushTokensDeleteEq = jest.fn();
  mockStorageUpload = jest.fn();
  mockStorageGetPublicUrl = jest.fn();

  mockSupabaseFrom.mockImplementation((tableName: string) => {
    if (tableName === 'items') {
      mockItemsInsert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockItemsSelectAfterInsert }) });
      return { insert: mockItemsInsert };
    } else if (tableName === 'profiles') {
      mockProfilesUpdate.mockReturnValue({ eq: mockProfilesUpdateEq });
      return { update: mockProfilesUpdate };
    } else if (tableName === 'push_tokens') {
      // For: .from('push_tokens').select('push_token').not('push_token', 'is', null)
      // .select() returns an object that has a .not() method.
      // This .not() method (mockPushTokensSelectNot) is then called and resolves.
      const selectChainable = { not: mockPushTokensSelectNot };
      mockPushTokensSelect.mockReturnValue(selectChainable);

      mockPushTokensDelete.mockReturnValue({ eq: mockPushTokensDeleteEq });
      return {
        upsert: mockPushTokensUpsert,
        select: mockPushTokensSelect,
        delete: mockPushTokensDelete,
      };
    }
    // Fallback
    const fallbackItemsSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const fallbackItemsSelect = jest.fn().mockReturnValue({ single: fallbackItemsSingle });
    const fallbackInsert = jest.fn().mockReturnValue({ select: fallbackItemsSelect });
    const fallbackUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const fallbackUpdate = jest.fn().mockReturnValue({ eq: fallbackUpdateEq });
    const fallbackPushSelectNot = jest.fn().mockResolvedValue({ data: [], error: null});
    const fallbackPushSelect = jest.fn().mockReturnValue({not: fallbackPushSelectNot});
    const fallbackDeleteEq = jest.fn().mockResolvedValue({ error: null });
    const fallbackDelete = jest.fn().mockReturnValue({ eq: fallbackDeleteEq });

    return {
      insert: fallbackInsert,
      update: fallbackUpdate,
      select: fallbackPushSelect,
      delete: fallbackDelete,
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };
  });

  mockSupabaseStorageFrom.mockImplementation((bucketName: string) => {
    if (bucketName === 'item-images') {
      return {
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
      };
    }
    return {
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'fallback-url' } }),
    };
  });

  return {
    supabase: {
      auth: { getUser: mockSupabaseAuthGetUser },
      from: mockSupabaseFrom,
      storage: { from: mockSupabaseStorageFrom },
    },
  };
});

jest.mock('expo-image-picker');
jest.mock('expo-file-system');
jest.mock('expo-notifications');

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

// Ensure this is set before AddItemScreen is imported or rendered if it reads it at module level
// Though your code reads it inside sendNotification, which is fine.
process.env.EXPO_PUBLIC_PROJECT_ID = 'test-project-id';


if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
let mockFetch: jest.Mock;


describe('AddItemScreen', () => {
  let mockLaunchImageLibraryAsyncInternal: jest.Mock<Promise<ImagePicker.ImagePickerResult>>;
  let mockLaunchCameraAsyncInternal: jest.Mock<Promise<ImagePicker.ImagePickerResult>>;
  let mockGetPermissionsAsyncInternal: jest.Mock;
  let mockRequestPermissionsAsyncInternal: jest.Mock;
  let mockGetExpoPushTokenAsyncInternal: jest.Mock;

  // Style objects from your component for direct comparison
  const typeButtonLostActiveStyle = { backgroundColor: '#fee2e2' };
  const typeButtonFoundActiveStyle = { backgroundColor: '#d1fae5' };
  const typeButtonInactiveStyle = { backgroundColor: 'transparent' };


  beforeEach(() => {
    jest.clearAllMocks();

    mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: 'ok', id: 'receipt-id' }] }),
    }));
    global.fetch = mockFetch;

    mockSupabaseAuthGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@example.com' } }, error: null });
    mockItemsSelectAfterInsert.mockResolvedValue({ data: { id: 1, title: 'Test Item', type: 'lost', user_id: 'test-user-id' }, error: null });
    mockProfilesUpdateEq.mockResolvedValue({ error: null });
    mockPushTokensUpsert.mockResolvedValue({ error: null });
    // mockPushTokensSelectNot is called with ('push_token', 'is', null) and resolves
    mockPushTokensSelectNot.mockResolvedValue({ data: [{ push_token: 'recipient-token-1' }], error: null });
    mockPushTokensDeleteEq.mockResolvedValue({ error: null });

    mockStorageUpload.mockResolvedValue({ data: { path: 'test-path.jpg' }, error: null });
    mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: 'test-image-url' } });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64-encoded-image-data');

    mockLaunchImageLibraryAsyncInternal = jest.fn();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockImplementation(mockLaunchImageLibraryAsyncInternal);
    mockLaunchImageLibraryAsyncInternal.mockResolvedValue({
      assets: [{ uri: 'file://mocked-uri.jpg', width: 100, height: 100, type: 'image' }], // Added type
      canceled: false
    });

    mockLaunchCameraAsyncInternal = jest.fn();
    (ImagePicker.launchCameraAsync as jest.Mock).mockImplementation(mockLaunchCameraAsyncInternal);
    mockLaunchCameraAsyncInternal.mockResolvedValue({
      assets: [{ uri: 'file://mocked-camera-uri.jpg', width: 100, height: 100, type: 'image' }], // Added type
      canceled: false
    });

    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    mockGetPermissionsAsyncInternal = jest.fn().mockResolvedValue({ status: 'granted' });
    (Notifications.getPermissionsAsync as jest.Mock).mockImplementation(mockGetPermissionsAsyncInternal);
    mockRequestPermissionsAsyncInternal = jest.fn().mockResolvedValue({ status: 'granted' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockImplementation(mockRequestPermissionsAsyncInternal);
    mockGetExpoPushTokenAsyncInternal = jest.fn().mockResolvedValue({ data: 'current-user-push-token' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockImplementation(mockGetExpoPushTokenAsyncInternal);
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<AddItemScreen />);
    expect(getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard')).toBeDefined();
    expect(getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.')).toBeDefined();
    expect(getByText('Lost Item')).toBeDefined();
    expect(getByText('Found Item')).toBeDefined();
    expect(getByText('Post Item')).toBeDefined();
    expect(getByText('Add Photo')).toBeDefined();
  });

  it('opens image picker modal when "Add Photo" is pressed', async () => {
    const { getByText } = render(<AddItemScreen />);
    fireEvent.press(getByText('Add Photo'));
    await waitFor(() => expect(getByText('Choose from Gallery')).toBeDefined());
    expect(getByText('Take Photo')).toBeDefined();
    expect(getByText('Cancel')).toBeDefined();
  });

  it('closes the image picker modal when "Cancel" is pressed', async () => {
    const { getByText, queryByText } = render(<AddItemScreen />);
    fireEvent.press(getByText('Add Photo'));
    await waitFor(() => expect(getByText('Cancel')).toBeDefined());
    fireEvent.press(getByText('Cancel'));
    await waitFor(() => {
      expect(queryByText('Choose from Gallery')).toBeNull();
      expect(queryByText('Take Photo')).toBeNull();
    });
  });

  it('shows alert if title or description is missing', async () => {
    const { getByText, getByPlaceholderText } = render(<AddItemScreen />);
    const mockAlert = jest.spyOn(Alert, 'alert');

    fireEvent.press(getByText('Post Item'));
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Missing Information', 'Please fill in both title and description.'));
    mockAlert.mockClear();

    fireEvent.changeText(getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard'), 'Some Title');
    fireEvent.press(getByText('Post Item'));
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Missing Information', 'Please fill in both title and description.'));
    mockAlert.mockClear();

    fireEvent.changeText(getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.'), 'Some Description');
    fireEvent.press(getByText('Post Item'));
    await waitFor(() => expect(mockItemsInsert).toHaveBeenCalled());
    expect(mockAlert).not.toHaveBeenCalledWith('Missing Information', 'Please fill in both title and description.');
    mockAlert.mockRestore();
  });

  it('shows loading indicator during submission', async () => {
    mockItemsSelectAfterInsert.mockImplementation(() => new Promise(() => {}));
    const { getByText, getByPlaceholderText } = render(<AddItemScreen />);
    fireEvent.changeText(getByPlaceholderText('e.g., Black Wallet, Keys on Red Lanyard'), 'Loading Item');
    fireEvent.changeText(getByPlaceholderText('Describe the item, last seen location/time, specific markings, etc.'), 'Loading description.');
    fireEvent.press(getByText('Post Item'));
    await waitFor(() => expect(getByText('Posting...')).toBeDefined());
  });
});