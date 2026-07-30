import React from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  PageSection,
  Title,
  Content,
  Tabs,
  Tab,
  TabTitleText,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Label,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  Button,
  Bullseye,
  Flex,
  FlexItem,
  MenuToggle,
  Select,
  SelectOption,
  SelectList,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  TextInput,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  LabelGroup,
  ExpandableSection,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  FolderIcon,
  TimesIcon,
  EllipsisVIcon,
  PencilAltIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { useSearchParams, Link } from 'react-router-dom';
import {
  useK8sNamespaces,
  useCollections,
  fetchTablesAndVolumes,
  useConnections,
  useCreateNamespace,
  useDeleteNamespace,
  useDeleteTable,
  useDeleteVolume,
  type CollectionInfo,
  type TableAsset,
  type DataConnection,
} from './useCatalogApi';
import ConnectionsTab from './ConnectionsTab';
import RegisterTableModal from './RegisterTableModal';
import RegisterVolumeModal from './RegisterVolumeModal';
import EditTableModal from './EditTableModal';
import EditVolumeModal from './EditVolumeModal';

const FORMAT_COLORS: Record<string, 'orange' | 'blue' | 'green' | 'grey' | 'teal' | 'purple'> = {
  iceberg: 'orange',
  parquet: 'blue',
  delta: 'green',
  csv: 'grey',
  postgresql: 'teal',
  mysql: 'teal',
  snowflake: 'purple',
  mssql: 'teal',
  mongodb: 'green',
};

const DataRegistryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'assets';
  const selectedProject = searchParams.get('project') || '';

  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [projectFilter, setProjectFilter] = React.useState('');
  const [selectedCollections, setSelectedCollections] = React.useState<string[]>([]);
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [nameFilter, setNameFilter] = React.useState('');
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const [showCreateCollection, setShowCreateCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [registerType, setRegisterType] = React.useState<'table' | 'volume' | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ name: string; namespace: string; isVolume: boolean } | null>(null);
  const [editTarget, setEditTarget] = React.useState<TableAsset | null>(null);
  const [openKebab, setOpenKebab] = React.useState<string | null>(null);

  const namespacesQuery = useK8sNamespaces();
  const allNamespaces = namespacesQuery.data || [];
  const HIDDEN_NS = ['openshift', 'default', 'system', 'redhat-ods-applications'];
  const projects = React.useMemo(() =>
    allNamespaces.filter((ns) =>
      !ns.name.startsWith('openshift-') &&
      !ns.name.startsWith('kube-') &&
      !HIDDEN_NS.includes(ns.name)
    ),
    [allNamespaces],
  );

  const collectionsQuery = useCollections(selectedProject);
  const collections: CollectionInfo[] = collectionsQuery.data || [];

  const connectionsQuery = useConnections(selectedProject);
  const connections: DataConnection[] = connectionsQuery.data || [];

  const createNamespace = useCreateNamespace();
  const deleteNamespace = useDeleteNamespace();
  const deleteTable = useDeleteTable();
  const deleteVolume = useDeleteVolume();

  const collectionsToFetch = React.useMemo(() => {
    if (selectedCollections.length > 0) return selectedCollections;
    return collections.map((c) => c.name);
  }, [selectedCollections, collections]);

  const allAssets = useMultiCollectionAssets(selectedProject, collectionsToFetch);

  const filteredAssets = React.useMemo(() => {
    if (!nameFilter) return allAssets;
    const q = nameFilter.toLowerCase();
    return allAssets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    );
  }, [allAssets, nameFilter]);

  const handleTabSelect = (_: React.MouseEvent, tabKey: string | number) => {
    const params: Record<string, string> = { tab: String(tabKey) };
    if (selectedProject) params.project = selectedProject;
    setSearchParams(params);
  };

  const handleProjectChange = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const params: Record<string, string> = { tab: activeTab };
    if (value && value !== '__none__') params.project = String(value);
    setSearchParams(params);
    setIsProjectOpen(false);
    setProjectFilter('');
    setSelectedCollections([]);
  };

  const toggleCollection = (name: string) => {
    setSelectedCollections((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const toggleRowExpanded = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.isVolume) {
        await deleteVolume.mutateAsync({ project: selectedProject, namespace: deleteTarget.namespace, name: deleteTarget.name });
      } else {
        await deleteTable.mutateAsync({ project: selectedProject, namespace: deleteTarget.namespace, name: deleteTarget.name });
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredProjects = React.useMemo(() => {
    if (!projectFilter) return projects;
    const q = projectFilter.toLowerCase();
    return projects.filter((ns) => ns.name.toLowerCase().includes(q));
  }, [projects, projectFilter]);

  const isLoading = namespacesQuery.isLoading || (selectedProject && collectionsQuery.isLoading);
  const registerNamespace = selectedCollections.length === 1
    ? selectedCollections[0]
    : 'default';

  return (
    <>
      <PageSection>
        <Title headingLevel="h1" size="2xl">Data assets</Title>
        <Content component="p" style={{ color: '#6a6e73', marginTop: '8px' }}>
          Discover, manage, and connect enterprise data resources for your project. Browse curated catalogs, view registered schemas and datasets, or manage namespace-scoped data connections.
        </Content>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Toolbar style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '8px' }}>
          <ToolbarContent>
            <ToolbarItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><span style={{ fontWeight: 500 }}>Project</span></FlexItem>
                <FlexItem>
                  <Select
                    isOpen={isProjectOpen}
                    selected={selectedProject || '__none__'}
                    onSelect={handleProjectChange}
                    onOpenChange={(open) => { setIsProjectOpen(open); if (!open) setProjectFilter(''); }}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsProjectOpen(!isProjectOpen)}
                        isExpanded={isProjectOpen}
                        icon={<FolderIcon />}
                        style={{ minWidth: '200px' }}
                      >
                        {selectedProject || 'Select a project'}
                      </MenuToggle>
                    )}
                  >
                    <div style={{ padding: '8px' }}>
                      <SearchInput
                        placeholder="Filter registries"
                        value={projectFilter}
                        onChange={(_e, v) => setProjectFilter(v)}
                        onClear={() => setProjectFilter('')}
                      />
                    </div>
                    <Divider />
                    <SelectList>
                      {filteredProjects.map((p) => (
                        <SelectOption key={p.name} value={p.name}>{p.name}</SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FlexItem>
                {selectedProject && (
                  <FlexItem>
                    <Link to={`/ai-hub/data/collections?project=${selectedProject}&tab=assets`} style={{ fontSize: '14px' }}>
                      Go to <FolderIcon style={{ marginLeft: '2px', marginRight: '2px' }} /> <strong>{selectedProject}</strong>
                    </Link>
                  </FlexItem>
                )}
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Tabs activeKey={activeTab} onSelect={handleTabSelect} style={{ paddingLeft: '16px' }}>
          <Tab eventKey="assets" title={<TabTitleText>Registry</TabTitleText>}>
            {!selectedProject ? (
              <PageSection>
                <EmptyState titleText="Select a project" icon={() => null}>
                  <EmptyStateBody>Choose a project from the dropdown above to view assets.</EmptyStateBody>
                </EmptyState>
              </PageSection>
            ) : (
              <PageSection>
                {/* Toolbar: Collections filter + search + actions */}
                <Toolbar style={{ borderBottom: '1px solid #d2d2d2', paddingBottom: '12px', marginBottom: '16px' }}>
                  <ToolbarContent>
                    <ToolbarItem>
                      <Select
                        isOpen={isCollectionOpen}
                        onOpenChange={setIsCollectionOpen}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setIsCollectionOpen(!isCollectionOpen)}
                            isExpanded={isCollectionOpen}
                            style={{ minWidth: '160px' }}
                          >
                            Collections
                          </MenuToggle>
                        )}
                        onSelect={() => {}}
                      >
                        <SelectList>
                          {collections.map((c) => (
                            <SelectOption
                              key={c.name}
                              value={c.name}
                              hasCheckbox
                              isSelected={selectedCollections.includes(c.name)}
                              onClick={() => toggleCollection(c.name)}
                              description={c.description || undefined}
                            >
                              {c.name}
                            </SelectOption>
                          ))}
                        </SelectList>
                      </Select>
                    </ToolbarItem>
                    <ToolbarItem>
                      <SearchInput
                        placeholder="Find by name"
                        value={nameFilter}
                        onChange={(_e, v) => setNameFilter(v)}
                        onClear={() => setNameFilter('')}
                      />
                    </ToolbarItem>
                    <ToolbarGroup align={{ default: 'alignEnd' }}>
                      <ToolbarItem>
                        <Dropdown
                          isOpen={isRegisterOpen}
                          onOpenChange={setIsRegisterOpen}
                          toggle={(toggleRef) => (
                            <MenuToggle ref={toggleRef} variant="primary" onClick={() => setIsRegisterOpen(!isRegisterOpen)} isExpanded={isRegisterOpen}>
                              Register data
                            </MenuToggle>
                          )}
                        >
                          <DropdownList>
                            <DropdownItem key="table" onClick={() => { setRegisterType('table'); setIsRegisterOpen(false); }}>
                              Register table
                            </DropdownItem>
                            <DropdownItem key="volume" onClick={() => { setRegisterType('volume'); setIsRegisterOpen(false); }}>
                              Register volume
                            </DropdownItem>
                          </DropdownList>
                        </Dropdown>
                      </ToolbarItem>
                      <ToolbarItem>
                        <Button variant="secondary" onClick={() => setShowCreateCollection(true)}>
                          Create collection
                        </Button>
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                </Toolbar>

                {/* Filter chips */}
                {selectedCollections.length > 0 && (
                  <Flex style={{ marginBottom: '12px' }} alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <LabelGroup>
                        {selectedCollections.map((c) => (
                          <Label key={c} onClose={() => toggleCollection(c)} variant="outline">
                            {c}
                          </Label>
                        ))}
                      </LabelGroup>
                    </FlexItem>
                    <FlexItem>
                      <span style={{ fontSize: '13px', color: '#6a6e73', marginLeft: '8px' }}>
                        {selectedCollections.length} filter{selectedCollections.length !== 1 ? 's' : ''} applied
                      </span>
                    </FlexItem>
                    <FlexItem>
                      <Button variant="link" isInline onClick={() => setSelectedCollections([])}>
                        Clear filters
                      </Button>
                    </FlexItem>
                  </Flex>
                )}

                {isLoading ? (
                  <Bullseye style={{ minHeight: '200px' }}><Spinner /></Bullseye>
                ) : filteredAssets.length === 0 ? (
                  <EmptyState titleText="No data assets" icon={() => null}>
                    <EmptyStateBody>
                      {nameFilter ? 'No assets match your search.' : 'Register tables or volumes to get started.'}
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label="Data assets" variant="compact">
                    <Thead>
                      <Tr>
                        <Th width={25}>Name</Th>
                        <Th width={10}>Asset type</Th>
                        <Th width={10}>Format</Th>
                        <Th width={20}>Storage location</Th>
                        <Th width={10}>Connections</Th>
                        <Th width={15}>Tags</Th>
                        <Th width={10} />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredAssets.map((asset) => {
                        const rowKey = `${asset.namespace}-${asset.name}-${asset.isVolume ? 'v' : 't'}`;
                        const isExpanded = expandedRows.has(rowKey);
                        return (
                          <React.Fragment key={rowKey}>
                            <Tr
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleRowExpanded(rowKey)}
                            >
                              <Td dataLabel="Name">
                                <div><strong>{asset.name}</strong></div>
                                {asset.description && (
                                  <div style={{ fontSize: '13px', color: '#6a6e73', marginTop: '2px' }}>
                                    {asset.description.length > 80 ? `${asset.description.substring(0, 80)}...` : asset.description}
                                  </div>
                                )}
                              </Td>
                              <Td dataLabel="Asset type">
                                {asset.isVolume ? 'Volume' : 'Table'}
                              </Td>
                              <Td dataLabel="Format">
                                {asset.isVolume ? (
                                  <Label isCompact variant="outline" color="grey">Unstructured</Label>
                                ) : asset.format ? (
                                  <Label isCompact variant="outline" color={FORMAT_COLORS[asset.format] || 'grey'}>
                                    {asset.format}
                                  </Label>
                                ) : '—'}
                              </Td>
                              <Td dataLabel="Storage location">
                                <span style={{ fontSize: '13px' }}>
                                  {asset.location ? (asset.location.length > 30 ? `${asset.location.substring(0, 30)}...` : asset.location) : '—'}
                                </span>
                              </Td>
                              <Td dataLabel="Connection">
                                {asset.connectionRef ? (
                                  <Label isCompact color="blue">{asset.connectionRef}</Label>
                                ) : '—'}
                              </Td>
                              <Td dataLabel="Tags">
                                <LabelGroup numLabels={2}>
                                  {Object.entries(asset.properties || {}).slice(0, 3).map(([k, v]) => (
                                    <Label key={k} isCompact variant="outline">{k}: {v}</Label>
                                  ))}
                                </LabelGroup>
                              </Td>
                              <Td dataLabel="Actions" isActionCell>
                                <Dropdown
                                  isOpen={openKebab === rowKey}
                                  onOpenChange={(open) => setOpenKebab(open ? rowKey : null)}
                                  toggle={(toggleRef) => (
                                    <MenuToggle
                                      ref={toggleRef}
                                      variant="plain"
                                      onClick={(e) => { e.stopPropagation(); setOpenKebab(openKebab === rowKey ? null : rowKey); }}
                                      isExpanded={openKebab === rowKey}
                                    >
                                      <EllipsisVIcon />
                                    </MenuToggle>
                                  )}
                                  popperProps={{ position: 'right' }}
                                >
                                  <DropdownList>
                                    <DropdownItem key="edit" onClick={(e) => { e.stopPropagation(); setEditTarget(asset); setOpenKebab(null); }}>
                                      Edit
                                    </DropdownItem>
                                    <DropdownItem key="delete" onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({ name: asset.name, namespace: asset.namespace, isVolume: asset.isVolume });
                                      setOpenKebab(null);
                                    }}>
                                      Delete
                                    </DropdownItem>
                                    <DropdownItem key="provenance" isDisabled>
                                      View provenance
                                    </DropdownItem>
                                  </DropdownList>
                                </Dropdown>
                              </Td>
                            </Tr>
                            {isExpanded && (
                              <Tr>
                                <Td colSpan={7} style={{ backgroundColor: '#f5f5f5', padding: '16px 24px' }}>
                                  <AssetDetailPanel asset={asset} />
                                </Td>
                              </Tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </PageSection>
            )}
          </Tab>
          <Tab eventKey="connections" title={<TabTitleText>Connections</TabTitleText>}>
            <ConnectionsTab project={selectedProject || ''} />
          </Tab>
        </Tabs>
      </PageSection>

      {/* Create collection modal */}
      {showCreateCollection && (
        <Modal variant={ModalVariant.small} isOpen onClose={() => { setShowCreateCollection(false); setNewCollectionName(''); }} aria-label="Create collection">
          <ModalHeader title="Create collection" />
          <ModalBody>
            <Form>
              <FormGroup label="Name" isRequired fieldId="collection-name">
                <TextInput id="collection-name" value={newCollectionName} onChange={(_e, v) => setNewCollectionName(v)} isRequired placeholder="e.g. underwriting" />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" isDisabled={!newCollectionName.trim() || createNamespace.isPending} isLoading={createNamespace.isPending}
              onClick={async () => {
                await createNamespace.mutateAsync({ project: selectedProject, name: newCollectionName.trim() });
                setShowCreateCollection(false);
                setNewCollectionName('');
              }}
            >
              Create
            </Button>
            <Button variant="link" onClick={() => { setShowCreateCollection(false); setNewCollectionName(''); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete asset modal */}
      {deleteTarget && (
        <Modal variant={ModalVariant.small} isOpen onClose={() => setDeleteTarget(null)} aria-label="Delete asset">
          <ModalHeader title={`Delete ${deleteTarget.isVolume ? 'volume' : 'table'}`} />
          <ModalBody>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteTable.isPending || deleteVolume.isPending}>Delete</Button>
            <Button variant="link" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Register modals */}
      {registerType === 'table' && (
        <RegisterTableModal project={selectedProject} namespace={registerNamespace} connections={connections} onClose={() => setRegisterType(null)} />
      )}
      {registerType === 'volume' && (
        <RegisterVolumeModal project={selectedProject} namespace={registerNamespace} connections={connections} onClose={() => setRegisterType(null)} />
      )}

      {/* Edit modals */}
      {editTarget && !editTarget.isVolume && (
        <EditTableModal
          project={selectedProject}
          namespace={editTarget.namespace}
          name={editTarget.name}
          currentDescription={editTarget.description}
          currentProperties={editTarget.properties}
          onClose={() => setEditTarget(null)}
        />
      )}
      {editTarget && editTarget.isVolume && (
        <EditVolumeModal
          project={selectedProject}
          namespace={editTarget.namespace}
          name={editTarget.name}
          currentDescription={editTarget.description}
          currentLocation={editTarget.location}
          currentProperties={editTarget.properties}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
};

function useMultiCollectionAssets(project: string, collections: string[]): TableAsset[] {
  const results = useQueries({
    queries: collections.map((c) => ({
      queryKey: ['catalog', 'tables-and-volumes', project, c],
      queryFn: () => fetchTablesAndVolumes(project, c),
      enabled: !!project && !!c,
    })),
  });
  return React.useMemo(() => {
    const all: TableAsset[] = [];
    for (const r of results) {
      if (r.data) all.push(...r.data);
    }
    return all;
  }, [results]);
}

const AssetDetailPanel: React.FC<{ asset: TableAsset }> = ({ asset }) => {
  const detailRows: Array<[string, string]> = [];
  if (asset.location) detailRows.push(['Location', asset.location]);
  if (asset.connectionRef) detailRows.push(['Connection', asset.connectionRef]);
  if (asset.registeredBy) detailRows.push(['Registered by', asset.registeredBy]);
  if (asset.createdAt) detailRows.push(['Created', asset.createdAt]);
  if (asset.format) detailRows.push(['Format', asset.format]);

  const props = asset.properties || {};
  Object.entries(props).forEach(([k, v]) => {
    if (!['format', 'location', 'connection-ref', 'description'].includes(k)) {
      detailRows.push([k, v]);
    }
  });

  return (
    <div>
      <table style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
        <tbody>
          {detailRows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 500, color: '#6a6e73', whiteSpace: 'nowrap' }}>{label}</td>
              <td style={{ padding: '4px 0' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {asset.columns && asset.columns.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ fontSize: '13px' }}>Schema ({asset.columns.length} columns)</strong>
          <Table variant="compact" style={{ marginTop: '4px' }}>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Nullable</Th>
                <Th>Description</Th>
              </Tr>
            </Thead>
            <Tbody>
              {asset.columns.map((col, i) => (
                <Tr key={i}>
                  <Td>{col.name}</Td>
                  <Td>{col.type}</Td>
                  <Td>{col.nullable !== false ? 'yes' : 'no'}</Td>
                  <Td>{col.description || '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DataRegistryPage;
