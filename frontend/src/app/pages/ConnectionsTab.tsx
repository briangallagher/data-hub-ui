import React from 'react';
import {
  PageSection,
  Title,
  Spinner,
  EmptyState,
  EmptyStateBody,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  Button,
  Bullseye,
  Label,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TrashIcon } from '@patternfly/react-icons';
import { useConnections, useDeleteConnection } from './useCatalogApi';
import CreateConnectionModal from './CreateConnectionModal';

interface ConnectionsTabProps {
  project: string;
}

const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ project }) => {
  const [filterValue, setFilterValue] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const connectionsQuery = useConnections(project);
  const deleteMutation = useDeleteConnection();
  const connections = connectionsQuery.data || [];

  const filtered = React.useMemo(() => {
    if (!filterValue) return connections;
    const q = filterValue.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.endpoint.toLowerCase().includes(q) ||
        c.bucket.toLowerCase().includes(q),
    );
  }, [connections, filterValue]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ namespace: project, name: deleteTarget });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <PageSection>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: '16px' }}>
        Data connections
      </Title>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter connections..."
              value={filterValue}
              onChange={(_event, value) => setFilterValue(value)}
              onClear={() => setFilterValue('')}
            />
          </ToolbarItem>
          <ToolbarGroup align={{ default: 'alignEnd' }}>
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={() => setShowCreate(true)}
              >
                Create connection
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      {connectionsQuery.isLoading && (
        <Bullseye style={{ minHeight: '200px' }}>
          <Spinner />
        </Bullseye>
      )}

      {!connectionsQuery.isLoading && filtered.length === 0 && (
        <EmptyState titleText="No Data Connections found" icon={() => null}>
          <EmptyStateBody>
            {filterValue
              ? 'No connections match your filter.'
              : 'Create a Data Connection in your project to link storage credentials to catalog assets.'}
          </EmptyStateBody>
        </EmptyState>
      )}

      {!connectionsQuery.isLoading && filtered.length > 0 && (
        <Table aria-label="Connections table" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Display Name</Th>
              <Th>Type</Th>
              <Th>Namespace</Th>
              <Th>Endpoint</Th>
              <Th>Bucket</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((conn) => (
              <Tr key={`${conn.namespace}-${conn.name}`}>
                <Td dataLabel="Name">{conn.name}</Td>
                <Td dataLabel="Display Name">{conn.displayName}</Td>
                <Td dataLabel="Type">
                  <Label
                    isCompact
                    color={conn.connectionType === 's3' ? 'blue' : 'green'}
                  >
                    {conn.connectionType}
                  </Label>
                </Td>
                <Td dataLabel="Namespace">
                  <span style={{ color: '#06c' }}>{conn.namespace}</span>
                </Td>
                <Td dataLabel="Endpoint">{conn.endpoint || '—'}</Td>
                <Td dataLabel="Bucket">{conn.bucket || '—'}</Td>
                <Td dataLabel="Actions">
                  <Button
                    variant="plain"
                    aria-label="Delete"
                    onClick={() => setDeleteTarget(conn.name)}
                    style={{ padding: '4px' }}
                  >
                    <TrashIcon />
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {showCreate && (
        <CreateConnectionModal
          project={project}
          onClose={() => setShowCreate(false)}
        />
      )}

      {deleteTarget && (
        <Modal
          variant={ModalVariant.small}
          isOpen
          onClose={() => setDeleteTarget(null)}
          aria-label="Delete connection"
        >
          <ModalHeader title="Delete connection" />
          <ModalBody>
            Are you sure you want to delete the connection <strong>{deleteTarget}</strong>?
            This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              isDisabled={deleteMutation.isPending}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  );
};

export default ConnectionsTab;
