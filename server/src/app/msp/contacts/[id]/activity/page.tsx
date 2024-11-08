// server/src/app/msp/contacts/[id]/activity/page.tsx
import InteractionsFeed from '@/components/interactions/InteractionsFeed';
import { getInteractionsForEntity } from '@/lib/actions/interactionActions';
import ContactModel from '@/lib/models/contact';

export default async function ContactActivityPage({ params }: { params: { id: string } }) {
  const contact = await ContactModel.get(params.id);
  const interactions = await getInteractionsForEntity(params.id, 'contact');

  if (!contact) {
    return <div>Contact not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Activity Feed for {contact.full_name}</h1>
      <InteractionsFeed 
        entityId={contact.contact_name_id} 
        entityType="contact"
        interactions={interactions}
        setInteractions={() => {}}
      />
    </div>
  );
}

