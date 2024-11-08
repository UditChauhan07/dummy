// server/src/app/msp/contacts/page.tsx
import React from 'react';
import dynamic from 'next/dynamic';
import ContactModel from '@/lib/models/contact';
import UserModel from '@/lib/models/user';
import { User } from 'next-auth';

// Import Contacts component with ssr disabled
const Contacts = dynamic(() => import('@/components/contacts/Contacts'), { ssr: false });
const OverallInteractionsFeed = dynamic(
  () => import('@/components/interactions/OverallInteractionsFeed'),
  { ssr: false }
);

type IdName = { id: string; name: string };

export default async function ContactsPage() {
  const contacts = await ContactModel.getAll(true);
  const users = await UserModel.getAll(); 

  // Filter out any duplicate contacts based on contact_name_id
  const uniqueContacts = Array.from(
    new Map(contacts.map(contact => [contact.contact_name_id, contact])).values()
  );

  return (
    <div className="flex flex-col md:flex-row md:space-x-6">
      <div className="w-full md:w-2/3 mb-6 md:mb-0">
        <Contacts initialContacts={uniqueContacts} />
      </div>
      <div className="w-full md:w-1/3">
        <OverallInteractionsFeed 
          users={users.map((user):IdName => ({ id: user.user_id, name: user.username }))}
          contacts={uniqueContacts.map((contact):IdName => ({ 
            id: contact.contact_name_id,
            name: contact.full_name 
          }))}
        />
      </div>
    </div>
  );
}
