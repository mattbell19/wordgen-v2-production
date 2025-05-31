import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Fixed audience ID for registered users
const REGISTERED_USERS_AUDIENCE_ID = '979de85d-57ca-4d19-ba40-ed71ea87c9df';

export async function addResendContact(email: string, userId: number, audienceId: string = REGISTERED_USERS_AUDIENCE_ID) {
  try {
    console.log('Creating contact in Resend:', {
      email,
      userId,
      audienceId
    });

    const contact = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId,
    });

    console.log('Contact created successfully:', contact);
    return contact;
  } catch (error: any) {
    console.error('Failed to create contact in Resend:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw error;
  }
}

export async function getResendContact(email: string, audienceId: string = REGISTERED_USERS_AUDIENCE_ID) {
  try {
    const { data: contacts } = await resend.contacts.list({ audienceId });

    if (!contacts || !Array.isArray(contacts)) {
      console.log('No contacts found or invalid response:', contacts);
      return null;
    }

    const contact = contacts.find((c: any) => c.email === email);
    return contact || null;
  } catch (error) {
    console.error('Failed to get contact from Resend:', error);
    throw error;
  }
}

export async function updateResendContact(email: string, updates: { unsubscribed?: boolean }, audienceId: string = REGISTERED_USERS_AUDIENCE_ID) {
  try {
    // First get the contact to get their ID
    const contact = await getResendContact(email, audienceId);
    if (!contact || !contact.id) {
      throw new Error('Contact not found');
    }

    const updatedContact = await resend.contacts.update({
      id: contact.id,
      audienceId,
      ...updates
    });

    return updatedContact;
  } catch (error) {
    console.error('Failed to update contact in Resend:', error);
    throw error;
  }
}