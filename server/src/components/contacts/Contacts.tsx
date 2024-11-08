'use client';

import React, { useState, useEffect, useRef } from 'react';
import { IContact } from '@/interfaces/contact.interfaces';
import { ICompany } from '@/interfaces/company.interfaces';
import { ITag } from '@/interfaces/tag.interfaces';
import { getAllContacts, getContactsByCompany, getAllCompanies, exportContactsToCSV, deleteContact } from '@/lib/actions/contact-actions/contactActions';
import { findTagsByEntityIds, createTag, deleteTag, findAllTagsByType } from '@/lib/actions/tagActions';
import { Button } from '@/components/ui/Button';
import { Pen, Eye, CloudDownload, MoreVertical, Upload, Search, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { QuickAddContact } from './QuickAddContact';
import { useDrawer } from '@/context/DrawerContext';
import ContactDetailsView from './ContactDetailsView';
import ContactDetailsEdit from './ContactDetailsEdit';
import ContactsImportDialog from './ContactsImportDialog';
import CompanyDetails from '../companies/CompanyDetails';
import { DataTable } from '@/components/ui/DataTable';
import { ColumnDefinition } from '@/interfaces/dataTable.interfaces';
import { TagManager, TagFilter } from '@/components/tags';
import { getUniqueTagTexts } from '@/utils/colorUtils';
import { getAvatarUrl } from '@/utils/colorUtils';
import GenericDialog from '@/components/ui/GenericDialog';

interface ContactsProps {
  initialContacts: IContact[];
  companyId?: string;
  preSelectedCompanyId?: string;
}

const Contacts: React.FC<ContactsProps> = ({ initialContacts, companyId, preSelectedCompanyId }) => {
  const [contacts, setContacts] = useState<IContact[]>(initialContacts);
  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { openDrawer } = useDrawer();
  const contactTagsRef = useRef<Record<string, ITag[]>>({});
  const [allUniqueTags, setAllUniqueTags] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<IContact | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [fetchedContacts, allCompanies] = await Promise.all([
        companyId 
          ? getContactsByCompany(companyId, filterStatus !== 'active')
          : getAllContacts(filterStatus !== 'active'),
        getAllCompanies()
      ]);

      setContacts(fetchedContacts);
      setCompanies(allCompanies);

      const [contactTags, allTags] = await Promise.all([
        findTagsByEntityIds(
          fetchedContacts.map((contact: IContact): string => contact.contact_name_id),
          'contact'
        ),
        findAllTagsByType('contact')
      ]);

      const newContactTags: Record<string, ITag[]> = {};
      contactTags.forEach(tag => {
        if (!newContactTags[tag.tagged_id]) {
          newContactTags[tag.tagged_id] = [];
        }
        newContactTags[tag.tagged_id].push(tag);
      });
      
      contactTagsRef.current = newContactTags;
      setAllUniqueTags(allTags);
    };
    fetchData();
  }, [companyId, filterStatus]);

  const handleTagsChange = (contactId: string, updatedTags: ITag[]) => {
    contactTagsRef.current = {
      ...contactTagsRef.current,
      [contactId]: updatedTags,
    };
    setAllUniqueTags(getUniqueTagTexts(Object.values(contactTagsRef.current).flat()));
  };

  const getContactAvatar = (contact: IContact) => {
    return getAvatarUrl(contact.full_name, contact.contact_name_id);
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.company_id === companyId);
    return company ? company.company_name : 'Unknown Company';
  };

  const handleCheckboxChange = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleContactAdded = (newContact: IContact) => {
    setContacts(prevContacts => [...prevContacts, newContact]);
  };

  const handleViewDetails = (contact: IContact) => {
    openDrawer(
      <ContactDetailsView
        initialContact={contact}
        companies={companies}
      />
    );
  };

  const handleEditContact = (contact: IContact) => {
    openDrawer(
      <ContactDetailsEdit
        initialContact={contact}
        companies={companies}
        onSave={(updatedContact) => {
          setContacts(prevContacts =>
            prevContacts.map((c): IContact =>
              c.contact_name_id === updatedContact.contact_name_id ? updatedContact : c
            )
          );
          openDrawer(
            <ContactDetailsView
              initialContact={updatedContact}
              companies={companies}
            />
          );
        }}
        onCancel={() => openDrawer(<ContactDetailsView initialContact={contact} companies={companies} />)}
      />
    );
  };

  const handleDeleteContact = (contact: IContact) => {
    setContactToDelete(contact);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      const result = await deleteContact(contactToDelete.contact_name_id);
      
      if (!result.success) {
        if ('code' in result && result.code === 'CONTACT_HAS_DEPENDENCIES' && 'dependencies' in result && 'counts' in result) {
          const dependencies = result.dependencies || [];
          const counts = result.counts || {};
          const dependencyText = dependencies.map((dep: string): string => {
            const count = counts[dep] || 0;
            const readableTypes: Record<string, string> = {
              'ticket': 'active tickets',
              'interaction': 'interactions',
              'project': 'active projects',
              'document': 'documents',
              'timeEntry': 'time entries'
            };
            return `${count} ${readableTypes[dep] || `${dep}s`}`;
          }).join(', ');
          
          setDeleteError(
            `This contact cannot be deleted because it has the following associated records: ${dependencyText}. ` +
            `To maintain data integrity, you can edit the contact and set its status to inactive instead.`
          );
          return;
        }
        if ('message' in result) {
          throw new Error(result.message);
        }
        throw new Error('Failed to delete contact');
      }

      setContacts(prevContacts => 
        prevContacts.filter(c => c.contact_name_id !== contactToDelete.contact_name_id)
      );
      
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
      setDeleteError(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
      setDeleteError('An error occurred while deleting the contact. Please try again.');
    }
  };

  const handleMakeInactive = async () => {
    if (!contactToDelete) return;
    
    try {
      const response = await fetch(`/api/contacts/${contactToDelete.contact_name_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_inactive: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact status');
      }

      setContacts(prevContacts =>
        prevContacts.map((c): IContact =>
          c.contact_name_id === contactToDelete.contact_name_id
            ? { ...c, is_inactive: true }
            : c
        )
      );

      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
      setDeleteError(null);
    } catch (error) {
      console.error('Error updating contact:', error);
      setDeleteError('An error occurred while updating the contact status. Please try again.');
    }
  };

  const handleAddTag = async (contactId: string, tagText: string): Promise<ITag | undefined> => {
    if (!tagText.trim()) return undefined;
    try {
      const newTag = await createTag({
        tag_text: tagText,
        tagged_id: contactId,
        tagged_type: 'contact',
      });

      contactTagsRef.current = {
        ...contactTagsRef.current,
        [contactId]: [...(contactTagsRef.current[contactId] || []), newTag],
      };

      // Update allUniqueTags if it's a new tag
      if (!allUniqueTags.includes(tagText)) {
        setAllUniqueTags(prev => [...prev, tagText].sort());
      }

      return newTag;
    } catch (error) {
      console.error('Error adding tag:', error);
      return undefined;
    }
  };

  const handleRemoveTag = async (contactId: string, tagId: string): Promise<boolean> => {
    try {
      await deleteTag(tagId);
      contactTagsRef.current = {
        ...contactTagsRef.current,
        [contactId]: contactTagsRef.current[contactId].filter(tag => tag.tag_id !== tagId),
      };
      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      return false;
    }
  };

  const handleExportToCSV = async () => {
    try {
      const csvData = await exportContactsToCSV(filteredContacts, companies, contactTagsRef.current);
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'contacts.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting contacts to CSV:', error);
    }
  };

  const handleImportComplete = (newContacts: IContact[]) => {
    setContacts(prev => [...prev, ...newContacts]);
    setIsImportDialogOpen(false);
  };

  const handleCompanyClick = (companyId: string) => {
    const company = companies.find(c => c.company_id === companyId);
    if (company) {
      openDrawer(
        <CompanyDetails company={company} documents={[]} contacts={[]} isInDrawer={true} />
      );
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns: ColumnDefinition<IContact>[] = [
    {
      title: 'Name',
      dataIndex: 'full_name',
      render: (value, record) => (
        <div className="flex items-center">
          <img 
            className="h-8 w-8 rounded-full mr-2" 
            src={getAvatarUrl(value, record.contact_name_id, 32)}
            alt={`${value} avatar`}
            loading="lazy"
          />
          <button
            onClick={() => handleViewDetails(record)}
            className="text-blue-600 hover:underline"
          >
            {value}
          </button>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone_number',
    },
    {
      title: 'Company',
      dataIndex: 'company_id',
      render: (value, record) => (
        <button
          onClick={() => handleCompanyClick(value)}
          className="text-blue-600 hover:underline"
        >
          {getCompanyName(value)}
        </button>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'contact_name_id',
      render: (value, record) => (
        <TagManager
          entityId={value}
          entityType="contact"
          initialTags={contactTagsRef.current[value] || []}
          existingTags={allUniqueTags}
          onTagsChange={(tags) => handleTagsChange(value, tags)}
        />
      ),
    },
    {
      title: 'Actions',
      dataIndex: 'contact_name_id',
      render: (value, record) => (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="bg-white rounded-md shadow-lg p-1">
            <DropdownMenu.Item 
              className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 flex items-center"
              onSelect={() => handleViewDetails(record)}
            >
              <Eye size={14} className="mr-2" />
              View
            </DropdownMenu.Item>
            <DropdownMenu.Item 
              className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 flex items-center"
              onSelect={() => handleEditContact(record)}
            >
              <Pen size={14} className="mr-2" />
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item 
              className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 flex items-center text-red-600"
              onSelect={() => handleDeleteContact(record)}
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      ),
    },
  ];

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && !contact.is_inactive) ||
      (filterStatus === 'inactive' && contact.is_inactive);
    
    const matchesTags = selectedTags.length === 0 || (
      contactTagsRef.current[contact.contact_name_id]?.some(tag =>
        selectedTags.includes(tag.tag_text)
      )
    );

    return matchesSearch && matchesStatus && matchesTags;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => setIsQuickAddOpen(true)}>Add Contact</Button>
      </div>
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts"
                className="border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <TagFilter
              allTags={allUniqueTags}
              selectedTags={selectedTags}
              onTagSelect={(tag) => {
                setSelectedTags(prev =>
                  prev.includes(tag)
                    ? prev.filter(t => t !== tag)
                    : [...prev, tag]
                );
              }}
            />

            <select
              className="border border-gray-300 rounded-md p-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All contacts</option>
              <option value="active">Active contacts</option>
              <option value="inactive">Inactive contacts</option>
            </select>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button className="border border-gray-300 rounded-md p-2 flex items-center gap-2">
                <MoreVertical size={16} />
                Actions
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="bg-white rounded-md shadow-lg p-1">
              <DropdownMenu.Item 
                className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 flex items-center"
                onSelect={handleExportToCSV}
              >
                <CloudDownload size={14} className="mr-2" />
                Download CSV
              </DropdownMenu.Item>
              <DropdownMenu.Item 
                className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 flex items-center"
                onSelect={() => setIsImportDialogOpen(true)}
              >
                <Upload size={14} className="mr-2" />
                Upload CSV
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      <DataTable
        data={filteredContacts.map((contact): IContact => ({
          ...contact
        }))}
        columns={columns}
        pagination={true}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        pageSize={10}
      />
      </div>
      <QuickAddContact
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onContactAdded={handleContactAdded}
        companies={companies}
        selectedCompanyId={preSelectedCompanyId}
      />

      <ContactsImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportComplete={handleImportComplete}
        companies={companies}
      />

      {/* Delete Confirmation Dialog */}
      <GenericDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setContactToDelete(null);
          setDeleteError(null);
        }}
        title="Delete Contact"
      >
        <div className="p-6">
          {deleteError ? (
            <>
              <p className="mb-4 text-red-600">{deleteError}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setContactToDelete(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4">Are you sure you want to delete this contact? This action cannot be undone.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setContactToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </GenericDialog>
    </div>
  );
};

export default Contacts;
