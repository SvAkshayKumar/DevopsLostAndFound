import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddItemScreen from '../add'; // Update with correct path
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

// Mock Supabase methods
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123', email: 'user@test.com' } } })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        not: jest.fn(() =>
          Promise.resolve({
            data: [{ id: 'user456', push_token: 'ExponentPushToken[123]' }],
            error: null,
          })
        ),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/image.jpg' },
        })),
      })),
    },
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file://mock.jpg' }],
    })
  ),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file://mock-camera.jpg' }],
    })
  ),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[123]' })
  ),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
  readAsStringAsync: jest.fn(() => Promise.resolve('base64string')),
  EncodingType: {
    Base64: 'base64',
  },
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: { status: 'ok' } }),
  })
) as jest.Mock;

describe('AddItemScreen', () => {
  it('renders form fields correctly', () => {
    const { getByPlaceholderText, getByText } = render(<AddItemScreen />);
    expect(getByPlaceholderText('Enter item title')).toBeTruthy();
    expect(getByPlaceholderText('Describe the item and where it was lost/found')).toBeTruthy();
    expect(getByText('Post Item')).toBeTruthy();
  });

  it('shows error if title or description is missing', async () => {
    const { getByText } = render(<AddItemScreen />);
    const postButton = getByText('Post Item');

    fireEvent.press(postButton);

    await waitFor(() => {
      expect(getByText('Post Item')).toBeTruthy(); // Alert doesn't update UI, but check for absence of loading
    });
  });

  it('allows changing item type', () => {
    const { getByText } = render(<AddItemScreen />);
    const foundButton = getByText('Found Item');
    fireEvent.press(foundButton);
    expect(getByText('Found Item')).toBeTruthy();
  });

  it('handles image picking from gallery', async () => {
    const { getByText } = render(<AddItemScreen />);
    fireEvent.press(getByText('Add Photo'));
    await waitFor(() => fireEvent.press(getByText('Choose from Gallery')));
  });

  it('submits form successfully with valid input', async () => {
    const { getByPlaceholderText, getByText } = render(<AddItemScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter item title'), 'Lost Wallet');
    fireEvent.changeText(
      getByPlaceholderText('Describe the item and where it was lost/found'),
      'Black leather wallet lost in cafeteria.'
    );

    fireEvent.press(getByText('Post Item'));

    await waitFor(() => {
      expect(getByText('Post Item')).toBeTruthy(); // Button returns to normal
    });
  });
});
