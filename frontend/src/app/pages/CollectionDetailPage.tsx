import React from 'react';
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
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
  LabelGroup,
  Card,
  CardBody,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TrashIcon, PencilAltIcon } from '@patternfly/react-icons';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTablesAndVolumes, useConnections, useDeleteTable, useDeleteVolume } from './useCatalogApi';
import RegisterTableModal from './RegisterTableModal';
import RegisterVolumeModal from './RegisterVolumeModal';
import EditTableModal from './EditTableModal';
import EditVolumeModal from './EditVolumeModal';

const FORMAT_COLORS: Record<string, 'orange' | 'blue' | 'green' | 'purple' | 'grey'> = {
  iceberg: 'orange',
  parquet: 'blue',
  delta: 'green',
  csv: 'purple',
};

const SYSTEM_TAG_KEYS = new Set([
  'description', 'format', 'volume_type', 'asset_type',
  'connection-ref', 'connection_ref', 'owner',
]);

function getDisplayTags(tags: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(tags)
    .filter(([key]) => !SYSTEM_TAG_KEYS.has(key))
    .map(([key, value]) => ({ key, value }));
}

const CollectionDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const project = searchParams.get('project') || 'option2-poc';
  const namespace = name || '';
  const assetsQuery = useTablesAndVolumes(project, namespace);
  const connectionsQuery = useConnections(project);

  const [tableFilter, setTableFilter] = React.useState('');
  const [volumeFilter, setVolumeFilter] = React.useState('');
  const [showRegisterTable, setShowRegisterTable] = React.useState(false);
  const [showRegisterVolume, setShowRegisterVolume] = React.useState(false);
  const [deleteTableTarget, setDeleteTableTarget] = React.useState<string | null>(null);
  const [deleteVolumeTarget, setDeleteVolumeTarget] = React.useState<string | null>(null);
  const [editTableTarget, setEditTableTarget] = React.useState<string | null>(null);
  const [editVolumeTarget, setEditVolumeTarget] = React.useState<string | null>(null);

  const deleteTableMutation = useDeleteTable();
  const deleteVolumeMutation = useDeleteVolume();

  const allAssets = assetsQuery.data || [];
  const tables = allAssets.filter((a) => !a.isVolume);
  const volumes = allAssets.filter((a) => a.isVolume);
  const connections = connectionsQuery.data || [];

  const filteredTables = React.useMemo(() => {
    if (!tableFilter) return tables;
    const q = tableFilter.toLowerCase();
    return tables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [tables, tableFilter]);

  const filteredVolumes = React.useMemo(() => {
    if (!volumeFilter) return volumes;
    const q = volumeFilter.toLowerCase();
    return volumes.filter(
      (v) => v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q),
    );
  }, [volumes, volumeFilter]);

  const handleDeleteTable = async () => {
    if (!deleteTableTarget) return;
    try {
      await deleteTableMutation.mutateAsync({ project, namespace, name: deleteTableTarget });
    } finally {
      setDeleteTableTarget(null);
    }
  };

  const handleDeleteVolume = async () => {
    if (!deleteVolumeTarget) return;
    try {
      await deleteVolumeMutation.mutateAsync({ project, namespace, name: deleteVolumeTarget });
    } finally {
      setDeleteVolumeTarget(null);
    }
  };

  if (assetsQuery.isLoading) {
    return (
      <PageSection>
        <Bullseye style={{ minHeight: '300px' }}>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Breadcrumb style={{ marginBottom: '8px' }}>
          <BreadcrumbItem>
            <Link to={`/ai-hub/data/collections?project=${project}`}>Data registry</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{namespace}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="2xl">
          {namespace}
        </Title>
      </PageSection>

      {/* Tables Section */}
      <PageSection>
        <Card>
          <CardBody>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '16px' }}>
              Tables
            </Title>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Filter tables"
                    value={tableFilter}
                    onChange={(_event, value) => setTableFilter(value)}
                    onClear={() => setTableFilter('')}
                  />
                </ToolbarItem>
                <ToolbarGroup align={{ default: 'alignEnd' }}>
                  <ToolbarItem>
                    <Button variant="primary" onClick={() => setShowRegisterTable(true)}>
                      Register table
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>

        {filteredTables.length === 0 && (
          <EmptyState titleText="No tables" icon={() => null}>
            <EmptyStateBody>
              {tableFilter
                ? 'No tables match your filter.'
                : 'No tables registered in this collection yet.'}
            </EmptyStateBody>
          </EmptyState>
        )}

        {filteredTables.length > 0 && (
          <Table aria-label="Tables" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Format</Th>
                <Th>Type</Th>
                <Th>Storage location</Th>
                <Th>Connection</Th>
                <Th>Tags</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredTables.map((table) => {
                const displayTags = getDisplayTags(table.tags);
                const formatColor = FORMAT_COLORS[table.format?.toLowerCase()] || 'grey';
                return (
                  <Tr key={table.name}>
                    <Td dataLabel="Name">{table.name}</Td>
                    <Td dataLabel="Description">
                      <span style={{ fontSize: '13px', color: '#6a6e73' }}>
                        {table.description || '—'}
                      </span>
                    </Td>
                    <Td dataLabel="Format">
                      {table.format ? (
                        <Label isCompact color={formatColor}>
                          {table.format}
                        </Label>
                      ) : '—'}
                    </Td>
                    <Td dataLabel="Type">
                      <Label isCompact color="grey">
                        {table.volumeType || 'MANAGED'}
                      </Label>
                    </Td>
                    <Td dataLabel="Storage location">
                      <span
                        style={{ fontSize: '13px', maxWidth: '280px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={table.location}
                      >
                        {table.location || '—'}
                      </span>
                    </Td>
                    <Td dataLabel="Connection">
                      {table.connectionRef ? (
                        <Label isCompact color="blue">{table.connectionRef}</Label>
                      ) : '—'}
                    </Td>
                    <Td dataLabel="Tags">
                      {displayTags.length > 0 ? (
                        <LabelGroup numLabels={3}>
                          {displayTags.map((tag) => (
                            <Label key={tag.key} isCompact color="teal">
                              {tag.key}: {tag.value}
                            </Label>
                          ))}
                        </LabelGroup>
                      ) : '—'}
                    </Td>
                    <Td dataLabel="Actions">
                      <Button
                        variant="plain"
                        aria-label="Edit"
                        onClick={() => setEditTableTarget(table.name)}
                        style={{ padding: '4px' }}
                      >
                        <PencilAltIcon />
                      </Button>
                      <Button
                        variant="plain"
                        aria-label="Delete"
                        onClick={() => setDeleteTableTarget(table.name)}
                        style={{ padding: '4px' }}
                      >
                        <TrashIcon />
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
          </CardBody>
        </Card>
      </PageSection>

      {/* Volumes Section */}
      <PageSection>
        <Card>
          <CardBody>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '16px' }}>
              Volumes
            </Title>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Filter volumes"
                    value={volumeFilter}
                    onChange={(_event, value) => setVolumeFilter(value)}
                    onClear={() => setVolumeFilter('')}
                  />
                </ToolbarItem>
                <ToolbarGroup align={{ default: 'alignEnd' }}>
                  <ToolbarItem>
                    <Button variant="primary" onClick={() => setShowRegisterVolume(true)}>
                      Register volume
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>

        {filteredVolumes.length === 0 && (
          <EmptyState titleText="No volumes" icon={() => null}>
            <EmptyStateBody>
              {volumeFilter
                ? 'No volumes match your filter.'
                : 'No volumes registered in this collection yet.'}
            </EmptyStateBody>
          </EmptyState>
        )}

        {filteredVolumes.length > 0 && (
          <Table aria-label="Volumes" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Storage location</Th>
                <Th>Connection</Th>
                <Th>Tags</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredVolumes.map((vol) => {
                const displayTags = getDisplayTags(vol.tags);
                return (
                  <Tr key={vol.name}>
                    <Td dataLabel="Name">{vol.name}</Td>
                    <Td dataLabel="Description">
                      <span style={{ fontSize: '13px', color: '#6a6e73' }}>
                        {vol.description || '—'}
                      </span>
                    </Td>
                    <Td dataLabel="Type">
                      <Label isCompact color="green">
                        {vol.volumeType || 'EXTERNAL'}
                      </Label>
                    </Td>
                    <Td dataLabel="Storage location">
                      <span
                        style={{ fontSize: '13px', maxWidth: '280px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={vol.location}
                      >
                        {vol.location || '—'}
                      </span>
                    </Td>
                    <Td dataLabel="Connection">
                      {vol.connectionRef ? (
                        <Label isCompact color="blue">{vol.connectionRef}</Label>
                      ) : '—'}
                    </Td>
                    <Td dataLabel="Tags">
                      {displayTags.length > 0 ? (
                        <LabelGroup numLabels={3}>
                          {displayTags.map((tag) => (
                            <Label key={tag.key} isCompact color="teal">
                              {tag.key}: {tag.value}
                            </Label>
                          ))}
                        </LabelGroup>
                      ) : '—'}
                    </Td>
                    <Td dataLabel="Actions">
                      <Button
                        variant="plain"
                        aria-label="Edit"
                        onClick={() => setEditVolumeTarget(vol.name)}
                        style={{ padding: '4px' }}
                      >
                        <PencilAltIcon />
                      </Button>
                      <Button
                        variant="plain"
                        aria-label="Delete"
                        onClick={() => setDeleteVolumeTarget(vol.name)}
                        style={{ padding: '4px' }}
                      >
                        <TrashIcon />
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
          </CardBody>
        </Card>
      </PageSection>

      {showRegisterTable && (
        <RegisterTableModal
          project={project}
          namespace={namespace}
          connections={connections}
          onClose={() => setShowRegisterTable(false)}
        />
      )}

      {showRegisterVolume && (
        <RegisterVolumeModal
          project={project}
          namespace={namespace}
          connections={connections}
          onClose={() => setShowRegisterVolume(false)}
        />
      )}

      {deleteTableTarget && (
        <Modal
          variant={ModalVariant.small}
          isOpen
          onClose={() => setDeleteTableTarget(null)}
          aria-label="Delete table"
        >
          <ModalHeader title="Delete table" />
          <ModalBody>
            Are you sure you want to delete the table <strong>{deleteTableTarget}</strong>?
            This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDeleteTable}
              isLoading={deleteTableMutation.isPending}
              isDisabled={deleteTableMutation.isPending}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => setDeleteTableTarget(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {deleteVolumeTarget && (
        <Modal
          variant={ModalVariant.small}
          isOpen
          onClose={() => setDeleteVolumeTarget(null)}
          aria-label="Delete volume"
        >
          <ModalHeader title="Delete volume" />
          <ModalBody>
            Are you sure you want to delete the volume <strong>{deleteVolumeTarget}</strong>?
            This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDeleteVolume}
              isLoading={deleteVolumeMutation.isPending}
              isDisabled={deleteVolumeMutation.isPending}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => setDeleteVolumeTarget(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {editTableTarget && (() => {
        const table = tables.find((t) => t.name === editTableTarget);
        if (!table) return null;
        return (
          <EditTableModal
            project={project}
            namespace={namespace}
            name={table.name}
            currentDescription={table.description}
            currentProperties={table.tags}
            onClose={() => setEditTableTarget(null)}
          />
        );
      })()}

      {editVolumeTarget && (() => {
        const vol = volumes.find((v) => v.name === editVolumeTarget);
        if (!vol) return null;
        return (
          <EditVolumeModal
            project={project}
            namespace={namespace}
            name={vol.name}
            currentDescription={vol.description}
            currentProperties={vol.tags}
            currentLocation={vol.location}
            onClose={() => setEditVolumeTarget(null)}
          />
        );
      })()}
    </>
  );
};

export default CollectionDetailPage;
