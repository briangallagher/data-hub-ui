import React from 'react';
import {
  PageSection,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Label,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  Button,
  Bullseye,
  Icon,
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
  Checkbox,
  Divider,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  DatabaseIcon,
  PencilAltIcon,
  TrashIcon,
  FolderIcon,
  TableIcon,
  VolumeIcon,
} from '@patternfly/react-icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  useProjects,
  useK8sNamespaces,
  useCollections,
  useAllProjectsCollections,
  useCreateNamespace,
  useDeleteNamespace,
  useSearchAssets,
  type SearchResult,
  type CollectionInfo,
} from './useCatalogApi';
import ConnectionsTab from './ConnectionsTab';
import EditCollectionModal from './EditCollectionModal';

const TYPE_COLORS: Record<string, 'blue' | 'orange' | 'green'> = {
  collection: 'blue',
  table: 'orange',
  volume: 'green',
};

const CollectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'collections';
  const selectedProject = searchParams.get('project') || '';
  const [filterValue, setFilterValue] = React.useState('');
  const [includeAssets, setIncludeAssets] = React.useState(true);
  const navigate = useNavigate();

  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [projectFilter, setProjectFilter] = React.useState('');
  const [showCreateCollection, setShowCreateCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [editTarget, setEditTarget] = React.useState<string | null>(null);

  const namespacesQuery = useK8sNamespaces();
  const namespaces = namespacesQuery.data || [];

  const projectsQuery = useProjects();
  const projects = projectsQuery.data || [];

  // Empty string means "All projects"
  const activeProject = selectedProject;

  const singleProjectQuery = useCollections(activeProject || '');
  const allProjectsQuery = useAllProjectsCollections(activeProject ? [] : projects);

  const collections: CollectionInfo[] = activeProject
    ? (singleProjectQuery.data || [])
    : (allProjectsQuery.data || []);

  const createNamespace = useCreateNamespace();
  const deleteNamespace = useDeleteNamespace();

  const isSearchActive = filterValue.length >= 2;

  const searchQuery = useSearchAssets(
    activeProject,
    collections,
    isSearchActive ? filterValue : '',
    true,
  );
  const allSearchResults = searchQuery.data || [];
  const searchResults = React.useMemo(() => {
    if (includeAssets) return allSearchResults;
    return allSearchResults.filter((r) => r.type === 'collection');
  }, [allSearchResults, includeAssets]);

  const filteredCollections = React.useMemo(() => {
    if (!filterValue) return collections;
    if (isSearchActive) return [];
    const q = filterValue.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [collections, filterValue, isSearchActive]);

  const showSearchResults = isSearchActive && searchResults.length > 0;
  const showGallery = !showSearchResults;

  const handleTabSelect = (_: React.MouseEvent, tabKey: string | number) => {
    const params: Record<string, string> = { tab: String(tabKey) };
    if (activeProject) params.project = activeProject;
    setSearchParams(params);
  };

  const handleProjectChange = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const params: Record<string, string> = {};
    if (activeTab !== 'collections') params.tab = activeTab;
    if (value && value !== '__all__') params.project = String(value);
    setSearchParams(params);
    setIsProjectOpen(false);
    setProjectFilter('');
  };

  const EXCLUDED_PROJECTS = new Set(['default', 'system', 'openshift', 'opendatahub']);
  const filteredNamespaces = React.useMemo(() => {
    const visible = namespaces.filter(
      (ns) =>
        !ns.name.startsWith('openshift-') &&
        !ns.name.startsWith('kube-') &&
        !EXCLUDED_PROJECTS.has(ns.name),
    );
    if (!projectFilter) return visible;
    const q = projectFilter.toLowerCase();
    return visible.filter((ns) => ns.name.toLowerCase().includes(q));
  }, [namespaces, projectFilter]);

  const handleDeleteCollection = async () => {
    if (!deleteTarget) return;
    const proj = activeProject || collections.find((c) => c.name === deleteTarget)?.project || '';
    try {
      await deleteNamespace.mutateAsync({ project: proj, name: deleteTarget });
    } finally {
      setDeleteTarget(null);
    }
  };

  const getResultLink = (result: SearchResult): string => {
    const base = `/ai-hub/data/collections`;
    if (result.type === 'collection') {
      return `${base}/${result.name}?project=${result.project}`;
    }
    return `${base}/${result.namespace}?project=${result.project}`;
  };

  const isLoading = namespacesQuery.isLoading || projectsQuery.isLoading ||
    (activeProject ? singleProjectQuery.isLoading : allProjectsQuery.isLoading);

  const displayProject = activeProject || 'All projects';

  return (
    <>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Data Registry
        </Title>
      </PageSection>
      <PageSection padding={{ default: 'noPadding' }}>
        <Toolbar style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '8px' }}>
          <ToolbarContent>
            <ToolbarItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <span style={{ fontWeight: 500 }}>Project</span>
                </FlexItem>
                <FlexItem>
                  <Select
                      isOpen={isProjectOpen}
                      selected={activeProject || '__all__'}
                      onSelect={handleProjectChange}
                      onOpenChange={(open) => { setIsProjectOpen(open); if (!open) setProjectFilter(''); }}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsProjectOpen(!isProjectOpen)}
                          isExpanded={isProjectOpen}
                          icon={<FolderIcon />}
                          style={{ minWidth: '180px' }}
                        >
                          {displayProject}
                        </MenuToggle>
                      )}
                    >
                      <div style={{ padding: '8px' }}>
                        <SearchInput
                          placeholder="Project name"
                          value={projectFilter}
                          onChange={(_event, value) => setProjectFilter(value)}
                          onClear={() => setProjectFilter('')}
                          aria-label="Filter projects"
                        />
                      </div>
                      <Divider />
                      <SelectList>
                        <SelectOption key="__all__" value="__all__">
                          All projects
                        </SelectOption>
                        {filteredNamespaces.map((ns) => (
                          <SelectOption key={ns.name} value={ns.name}>
                            {ns.name}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                </FlexItem>
                {activeProject && (
                  <FlexItem>
                    <Link to={`/ai-hub/data/collections?project=${activeProject}&tab=collections`} style={{ fontSize: '14px' }}>
                      Go to <FolderIcon style={{ marginLeft: '2px', marginRight: '2px' }} /> <strong>{activeProject}</strong>
                    </Link>
                  </FlexItem>
                )}
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Tabs
          activeKey={activeTab}
          onSelect={handleTabSelect}
          style={{ paddingLeft: '16px' }}
        >
          <Tab eventKey="collections" title={<TabTitleText>Collections</TabTitleText>}>
            <PageSection>
              <Toolbar style={{ borderBottom: '1px solid #d2d2d2', paddingBottom: '12px', marginBottom: '16px' }}>
                <ToolbarContent>
                  <ToolbarItem>
                    <SearchInput
                      placeholder="Search collections..."
                      value={filterValue}
                      onChange={(_event, value) => setFilterValue(value)}
                      onClear={() => setFilterValue('')}
                    />
                  </ToolbarItem>
                  <ToolbarItem>
                    <Checkbox
                      id="include-assets"
                      label="Include Tables/Volumes"
                      isChecked={includeAssets}
                      onChange={(_event, checked) => setIncludeAssets(checked)}
                    />
                  </ToolbarItem>
                  <ToolbarItem>
                    <Label color="blue" isCompact>
                      {showSearchResults
                        ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                        : `${filteredCollections.length} collection${filteredCollections.length !== 1 ? 's' : ''}`}
                    </Label>
                  </ToolbarItem>
                  <ToolbarGroup align={{ default: 'alignEnd' }}>
                    <ToolbarItem>
                      <Button
                      variant="primary"
                      isDisabled={!activeProject}
                      onClick={() => setShowCreateCollection(true)}
                    >
                      Create collection
                    </Button>
                    </ToolbarItem>
                  </ToolbarGroup>
                </ToolbarContent>
              </Toolbar>

              {(isLoading || (isSearchActive && searchQuery.isLoading)) && (
                <Bullseye style={{ minHeight: '200px' }}>
                  <Spinner />
                </Bullseye>
              )}

              {/* Search results — flat list with type labels */}
              {!isLoading && showSearchResults && (
                <Table aria-label="Search results" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Name</Th>
                      <Th>Collection</Th>
                      {!activeProject && <Th>Project</Th>}
                      <Th>Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {searchResults.map((result, idx) => (
                      <Tr key={`${result.type}-${result.project}-${result.namespace}-${result.name}-${idx}`}>
                        <Td dataLabel="Type">
                          <Label isCompact color={TYPE_COLORS[result.type]}>
                            {result.type === 'collection' && <DatabaseIcon style={{ marginRight: 4 }} />}
                            {result.type === 'table' && <TableIcon style={{ marginRight: 4 }} />}
                            {result.type === 'volume' && <VolumeIcon style={{ marginRight: 4 }} />}
                            {result.type}
                          </Label>
                        </Td>
                        <Td dataLabel="Name">
                          <Link
                            to={getResultLink(result)}
                            style={{ color: '#06c', textDecoration: 'none' }}
                          >
                            {result.name}
                          </Link>
                        </Td>
                        <Td dataLabel="Collection">
                          {result.type === 'collection' ? '—' : (
                            <Link
                              to={`/ai-hub/data/collections/${result.namespace}?project=${result.project}`}
                              style={{ color: '#06c', textDecoration: 'none' }}
                            >
                              {result.namespace}
                            </Link>
                          )}
                        </Td>
                        {!activeProject && (
                          <Td dataLabel="Project">
                            <Label isCompact variant="outline">{result.project}</Label>
                          </Td>
                        )}
                        <Td dataLabel="Description">
                          <span style={{ fontSize: '13px', color: '#6a6e73' }}>
                            {result.description || '—'}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}

              {!isLoading && isSearchActive && !searchQuery.isLoading && searchResults.length === 0 && (
                <EmptyState titleText="No results found" icon={() => null}>
                  <EmptyStateBody>
                    No collections, tables, or volumes match &ldquo;{filterValue}&rdquo;.
                  </EmptyStateBody>
                </EmptyState>
              )}

              {/* Collection cards gallery */}
              {!isLoading && showGallery && filteredCollections.length === 0 && !searchQuery.isLoading && (
                <EmptyState titleText="No collections found" icon={() => null}>
                  <EmptyStateBody>
                    {filterValue
                      ? 'No collections match your filter.'
                      : 'Collections will appear here once they are registered in the data catalog.'}
                  </EmptyStateBody>
                </EmptyState>
              )}

              {!isLoading && showGallery && filteredCollections.length > 0 && (
                <Gallery hasGutter minWidths={{ default: '320px' }}>
                  {filteredCollections.map((collection) => {
                    const cardProject = collection.project || activeProject;
                    return (
                      <GalleryItem key={`${collection.project}-${collection.name}`}>
                        <Card
                          isClickable
                          style={{ minHeight: '200px', cursor: 'pointer', border: '1px solid #d2d2d2', borderRadius: '8px' }}
                        >
                          <CardBody
                            onClick={() =>
                              navigate(`/ai-hub/data/collections/${collection.name}?project=${cardProject}`)
                            }
                          >
                            <Icon size="xl" style={{ color: '#06c', marginBottom: '12px' }}>
                              <DatabaseIcon />
                            </Icon>
                            <Title
                              headingLevel="h3"
                              size="md"
                              style={{ color: '#06c', marginBottom: '8px', cursor: 'pointer' }}
                            >
                              {collection.name}
                            </Title>
                            {collection.description && (
                              <p style={{ color: '#6a6e73', marginBottom: '12px', fontSize: '14px' }}>
                                {collection.description}
                              </p>
                            )}
                            {!activeProject && (
                              <Label isCompact variant="outline" color="purple" style={{ marginBottom: '8px' }}>
                                {collection.project}
                              </Label>
                            )}
                            <Flex
                              justifyContent={{ default: 'justifyContentSpaceBetween' }}
                              alignItems={{ default: 'alignItemsCenter' }}
                              style={{ marginTop: 'auto' }}
                            >
                              <FlexItem>
                                <Label isCompact variant="outline" style={{ marginRight: '4px' }}>
                                  Created {collection.createdDate || '—'}
                                </Label>
                              </FlexItem>
                              <FlexItem>
                                <Button
                                  variant="plain"
                                  aria-label="Edit"
                                  onClick={(e) => { e.stopPropagation(); setEditTarget(collection.name); }}
                                  style={{ padding: '4px' }}
                                >
                                  <PencilAltIcon />
                                </Button>
                                <Button
                                  variant="plain"
                                  aria-label="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(collection.name);
                                  }}
                                  style={{ padding: '4px' }}
                                >
                                  <TrashIcon />
                                </Button>
                              </FlexItem>
                            </Flex>
                          </CardBody>
                        </Card>
                      </GalleryItem>
                    );
                  })}
                </Gallery>
              )}
            </PageSection>
          </Tab>
          <Tab eventKey="connections" title={<TabTitleText>Connections</TabTitleText>}>
            <ConnectionsTab project={activeProject || namespaces[0]?.name || ''} />
          </Tab>
        </Tabs>
      </PageSection>

      {showCreateCollection && (
        <Modal
          variant={ModalVariant.small}
          isOpen
          onClose={() => { setShowCreateCollection(false); setNewCollectionName(''); }}
          aria-label="Create collection"
        >
          <ModalHeader title="Create collection" />
          <ModalBody>
            <Form>
              <FormGroup label="Name" isRequired fieldId="collection-name">
                <TextInput
                  id="collection-name"
                  value={newCollectionName}
                  onChange={(_event, val) => setNewCollectionName(val)}
                  isRequired
                  placeholder="e.g. underwriting"
                />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              isDisabled={!newCollectionName.trim() || createNamespace.isPending}
              isLoading={createNamespace.isPending}
              onClick={async () => {
                const collName = newCollectionName.trim();
                await createNamespace.mutateAsync({ project: activeProject, name: collName });
                setShowCreateCollection(false);
                setNewCollectionName('');
                navigate(`/ai-hub/data/collections/${collName}?project=${activeProject}`);
              }}
            >
              Create
            </Button>
            <Button variant="link" onClick={() => { setShowCreateCollection(false); setNewCollectionName(''); }}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          variant={ModalVariant.small}
          isOpen
          onClose={() => setDeleteTarget(null)}
          aria-label="Delete collection"
        >
          <ModalHeader title="Delete collection" />
          <ModalBody>
            Are you sure you want to delete the collection <strong>{deleteTarget}</strong>?
            All tables and volumes within it will be removed. This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDeleteCollection}
              isLoading={deleteNamespace.isPending}
              isDisabled={deleteNamespace.isPending}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {editTarget && (
        <EditCollectionModal
          project={activeProject || ''}
          name={editTarget}
          currentDescription={
            collections.find((c) => c.name === editTarget)?.description || ''
          }
          currentProperties={
            collections.find((c) => c.name === editTarget)?.properties || {}
          }
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
};

export default CollectionsPage;
