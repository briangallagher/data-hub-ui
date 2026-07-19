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
} from '@patternfly/react-core';
import { DatabaseIcon, PencilAltIcon, TrashIcon, FolderIcon } from '@patternfly/react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProjects, useCollections, useCreateNamespace } from './useCatalogApi';
import ConnectionsTab from './ConnectionsTab';

const CollectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'collections';
  const selectedProject = searchParams.get('project') || '';
  const [filterValue, setFilterValue] = React.useState('');
  const navigate = useNavigate();

  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [showCreateCollection, setShowCreateCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');

  const projectsQuery = useProjects();
  const projects = projectsQuery.data || [];

  const activeProject = selectedProject || '';

  const collectionsQuery = useCollections(activeProject || projects[0]?.name || '');
  const collections = collectionsQuery.data || [];
  const createNamespace = useCreateNamespace();

  const filtered = React.useMemo(() => {
    if (!filterValue) return collections;
    const q = filterValue.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [collections, filterValue]);

  const handleTabSelect = (_: React.MouseEvent, tabKey: string | number) => {
    const params: Record<string, string> = { tab: String(tabKey) };
    if (selectedProject) params.project = selectedProject;
    setSearchParams(params);
  };

  const handleProjectChange = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const params: Record<string, string> = {};
    if (activeTab !== 'collections') params.tab = activeTab;
    if (value && value !== '__all__') params.project = String(value);
    setSearchParams(params);
    setIsProjectOpen(false);
  };

  const isLoading = projectsQuery.isLoading || collectionsQuery.isLoading;

  return (
    <>
      <PageSection variant="light">
        <Title headingLevel="h1" size="2xl">
          Data Registry
        </Title>
      </PageSection>
      <PageSection variant="light" padding={{ default: 'noPadding' }}>
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
                      onOpenChange={(open) => setIsProjectOpen(open)}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsProjectOpen(!isProjectOpen)}
                          isExpanded={isProjectOpen}
                          icon={<FolderIcon />}
                          style={{ minWidth: '180px' }}
                        >
                          {activeProject || 'All projects'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        <SelectOption key="__all__" value="__all__">
                          All projects
                        </SelectOption>
                        {projects.map((p) => (
                          <SelectOption key={p.name} value={p.name}>
                            {p.name}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                </FlexItem>
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
                  <ToolbarItem variant="search-filter">
                    <SearchInput
                      placeholder="Filter by name or description"
                      value={filterValue}
                      onChange={(_event, value) => setFilterValue(value)}
                      onClear={() => setFilterValue('')}
                    />
                  </ToolbarItem>
                  <ToolbarItem>
                    <Label color="blue" isCompact>
                      {filtered.length} collection{filtered.length !== 1 ? 's' : ''}
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

              {isLoading && (
                <Bullseye style={{ minHeight: '200px' }}>
                  <Spinner />
                </Bullseye>
              )}

              {!isLoading && filtered.length === 0 && (
                <EmptyState titleText="No collections found" icon={() => null}>
                  <EmptyStateBody>
                    {filterValue
                      ? 'No collections match your filter.'
                      : 'Collections will appear here once they are registered in the data catalog.'}
                  </EmptyStateBody>
                </EmptyState>
              )}

              {!isLoading && filtered.length > 0 && (
                <Gallery hasGutter minWidths={{ default: '320px' }}>
                  {filtered.map((collection) => (
                    <GalleryItem key={collection.name}>
                      <Card
                        isClickable
                        style={{ minHeight: '200px', cursor: 'pointer', border: '1px solid #d2d2d2', borderRadius: '8px' }}
                      >
                        <CardBody
                          onClick={() =>
                            navigate(`/ai-hub/data/collections/${collection.name}?project=${activeProject}`)
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
                                onClick={(e) => { e.stopPropagation(); }}
                                style={{ padding: '4px' }}
                              >
                                <PencilAltIcon />
                              </Button>
                              <Button
                                variant="plain"
                                aria-label="Delete"
                                onClick={(e) => { e.stopPropagation(); }}
                                style={{ padding: '4px' }}
                              >
                                <TrashIcon />
                              </Button>
                            </FlexItem>
                          </Flex>
                        </CardBody>
                      </Card>
                    </GalleryItem>
                  ))}
                </Gallery>
              )}
            </PageSection>
          </Tab>
          <Tab eventKey="connections" title={<TabTitleText>Connections</TabTitleText>}>
            <ConnectionsTab project={activeProject} />
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
    </>
  );
};

export default CollectionsPage;
