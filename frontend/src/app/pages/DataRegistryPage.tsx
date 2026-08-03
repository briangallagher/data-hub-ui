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
  Badge,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  LabelGroup,
  ExpandableSection,
  Menu,
  MenuContent,
  MenuList,
  MenuItem,
  MenuFooter,
  MenuSearch,
  MenuSearchInput,
  Popper,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  CheckIcon,
  FilterIcon,
  TimesIcon,
  EllipsisVIcon,
  PencilAltIcon,
  TrashIcon,
} from '@patternfly/react-icons';

const RhFolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ style, ...props }) => (
  <svg fill="currentColor" viewBox="0 0 36 36" aria-hidden="true" role="img" width="1em" height="1em" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props}>
    <path d="M31 9.38h-3.71l-.52-2.47a.62.62 0 0 0-.61-.49h-7.32a.62.62 0 0 0-.61.49l-.52 2.47h-9.5a.62.62 0 0 0-.62.62v15a.63.63 0 0 0 1.25 0V10.62h9.37a.61.61 0 0 0 .61-.49l.53-2.46h6.3l.53 2.46a.61.61 0 0 0 .61.49h3.59v17.76H5.62V10a.62.62 0 0 0-1.24 0v19a.62.62 0 0 0 .62.62h26a.62.62 0 0 0 .62-.62V10a.62.62 0 0 0-.62-.62Z" />
  </svg>
);
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  useK8sNamespaces,
  useCollections,
  fetchTablesAndVolumes,
  useConnections,
  useCreateNamespace,
  useDeleteNamespace,
  useDeleteTable,
  useDeleteVolume,
  useTableDetail,
  type CollectionInfo,
  type TableAsset,
  type DataConnection,
} from './useCatalogApi';
import ConnectionsTab from './ConnectionsTab';
import RegisterDataModal from './RegisterDataModal';
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
  const location = useLocation();
  const pathPrefix = '/ai-hub/data/';
  const subPath = location.pathname.startsWith(pathPrefix) ? location.pathname.slice(pathPrefix.length) : '';
  const collectionMatch = subPath.match(/^collections\/([^/]+)\/([^/]+)$/);
  const connectionMatch = subPath.match(/^connections\/([^/]+)$/);
  const detailNamespace = collectionMatch?.[1];
  const detailAssetName = collectionMatch?.[2];
  const detailConnectionName = connectionMatch?.[1];
  const isDetailView = !!(detailNamespace && detailAssetName);
  const isConnectionDetailView = !!detailConnectionName;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = isConnectionDetailView ? 'connections' : (searchParams.get('tab') || 'assets');
  const selectedProject = searchParams.get('project') || '';
  const isVolume = searchParams.get('type') === 'volume';

  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [projectFilter, setProjectFilter] = React.useState('');
  const [selectedCollections, setSelectedCollections] = React.useState<string[]>([]);
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [collectionFilter, setCollectionFilter] = React.useState('');
  const [nameFilter, setNameFilter] = React.useState('');

  const [showCreateCollection, setShowCreateCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [showRegister, setShowRegister] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ name: string; namespace: string; isVolume: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  const [editTarget, setEditTarget] = React.useState<TableAsset | null>(null);
  const [openKebab, setOpenKebab] = React.useState<string | null>(null);
  const collectionToggleRef = React.useRef<HTMLButtonElement>(null);
  const collectionMenuRef = React.useRef<HTMLDivElement>(null);

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

  const detailQuery = useTableDetail(selectedProject, detailNamespace || '', detailAssetName || '');

  const createNamespace = useCreateNamespace();
  const deleteNamespace = useDeleteNamespace();
  const deleteTable = useDeleteTable();
  const deleteVolume = useDeleteVolume();

  const filteredCollections = React.useMemo(() => {
    if (!collectionFilter) return collections;
    const q = collectionFilter.toLowerCase();
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, collectionFilter]);

  const allCollectionNames = React.useMemo(() => collections.map((c) => c.name), [collections]);
  const isAllSources = selectedCollections.length === 0 ||
    (collections.length > 0 && selectedCollections.length === collections.length &&
      allCollectionNames.every((n) => selectedCollections.includes(n)));

  React.useEffect(() => {
    if (collections.length > 0 && selectedCollections.length === 0) {
      setSelectedCollections(allCollectionNames);
    }
  }, [collections, allCollectionNames, selectedCollections.length]);

  const collectionsToFetch = React.useMemo(() => {
    if (selectedCollections.length > 0) return selectedCollections;
    return allCollectionNames;
  }, [selectedCollections, allCollectionNames]);

  const allAssets = useMultiCollectionAssets(selectedProject, collectionsToFetch);

  const filteredAssets = React.useMemo(() => {
    if (!nameFilter) return allAssets;
    const q = nameFilter.toLowerCase();
    return allAssets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    );
  }, [allAssets, nameFilter]);

  const handleTabSelect = (_: React.MouseEvent, tabKey: string | number) => {
    const params = new URLSearchParams();
    params.set('tab', String(tabKey));
    if (selectedProject) params.set('project', selectedProject);
    navigate(`/ai-hub/data/collections?${params.toString()}`);
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

  React.useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      const params: Record<string, string> = { tab: activeTab, project: projects[0].name };
      setSearchParams(params);
    }
  }, [projects, selectedProject, activeTab, setSearchParams]);

  const isLoading = namespacesQuery.isLoading || (selectedProject && collectionsQuery.isLoading);
  const registerNamespace = selectedCollections.length === 1
    ? selectedCollections[0]
    : 'default';

  return (
    <>
      <PageSection>
        <Flex alignItems={{ default: 'alignItemsFlexStart' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem style={{ paddingTop: '2px' }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="#ECE6FF"/>
              <path d="M28 25.6712C27.5555 25.6712 27.1466 25.8045 26.8 26.0179L22.64 21.8579C23.0044 21.3334 23.2266 20.7023 23.2266 20.009C23.2266 19.9734 23.2177 19.929 23.2177 19.8934L25.0489 19.5023C25.5466 20.649 26.6844 21.449 28.0089 21.449C29.7866 21.449 31.2266 20.0001 31.2266 18.2312C31.2266 16.4623 29.7777 15.0134 28.0089 15.0134C26.24 15.0134 24.7911 16.4623 24.7911 18.2312C24.7911 18.2934 24.8089 18.3557 24.8089 18.4179L22.9955 18.8001C22.6577 17.9557 21.9644 17.2979 21.1111 16.9868L21.8666 13.4401C23.12 13.4045 24.1244 12.3734 24.1244 11.1112C24.1244 9.84899 23.0755 8.78233 21.7955 8.78233C20.5155 8.78233 19.4666 9.83122 19.4666 11.1112C19.4666 12.0357 20.0089 12.8268 20.7911 13.2001L20.0355 16.7734C19.3511 16.7734 18.7111 16.9957 18.1866 17.3601L14.6666 13.8401C15.0311 13.3157 15.2533 12.6845 15.2533 11.9912C15.2533 10.2134 13.8044 8.77344 12.0355 8.77344C10.2666 8.77344 8.81775 10.2223 8.81775 11.9912C8.81775 13.7601 10.2666 15.209 12.0355 15.209C12.72 15.209 13.36 14.9868 13.8844 14.6223L17.4044 18.1423C17.04 18.6668 16.8177 19.2979 16.8177 19.9912C16.8177 20.0268 16.8266 20.0712 16.8266 20.1068L14.0889 20.6845C13.6977 19.9468 12.9244 19.4312 12.0355 19.4312C10.7466 19.4312 9.70664 20.4801 9.70664 21.7601C9.70664 23.0401 10.7555 24.089 12.0355 24.089C13.3155 24.089 14.3644 23.0401 14.3644 21.7601L17.0489 21.1823C17.36 21.9557 17.9644 22.5779 18.7289 22.9245L18.3377 24.7734C18.3377 24.7734 18.2844 24.7734 18.2577 24.7734C16.48 24.7734 15.04 26.2223 15.04 27.9912C15.04 29.7601 16.4889 31.209 18.2577 31.209C20.0266 31.209 21.4755 29.7601 21.4755 27.9912C21.4755 26.6312 20.6222 25.4668 19.4222 24.9957L19.8044 23.1912C19.8755 23.1912 19.9555 23.2179 20.0266 23.2179C20.7111 23.2179 21.3511 22.9957 21.8755 22.6312L26.0355 26.7912C25.8222 27.1468 25.6889 27.5557 25.6889 27.9912C25.6889 29.2801 26.7377 30.3201 28.0177 30.3201C29.2977 30.3201 30.3466 29.2712 30.3466 27.9912C30.3466 26.7112 29.2977 25.6623 28.0177 25.6623L28 25.6712ZM28 16.1157C29.1644 16.1157 30.1155 17.0668 30.1155 18.2312C30.1155 19.3957 29.1644 20.3468 28 20.3468C26.8355 20.3468 25.8844 19.3957 25.8844 18.2312C25.8844 17.0668 26.8355 16.1157 28 16.1157ZM20.5511 11.1201C20.5511 10.4445 21.1022 9.89344 21.7777 9.89344C22.4533 9.89344 23.0044 10.4445 23.0044 11.1201C23.0044 11.7957 22.4533 12.3468 21.7777 12.3468C21.1022 12.3468 20.5511 11.7957 20.5511 11.1201ZM12 14.1245C10.8355 14.1245 9.88442 13.1734 9.88442 12.009C9.88442 10.8445 10.8355 9.89344 12 9.89344C13.1644 9.89344 14.1155 10.8445 14.1155 12.009C14.1155 13.1734 13.1644 14.1245 12 14.1245ZM12 23.0134C11.3244 23.0134 10.7733 22.4623 10.7733 21.7868C10.7733 21.1112 11.3244 20.5601 12 20.5601C12.6755 20.5601 13.2266 21.1112 13.2266 21.7868C13.2266 22.4623 12.6755 23.0134 12 23.0134ZM20.3377 28.009C20.3377 29.1734 19.3866 30.1245 18.2222 30.1245C17.0577 30.1245 16.1066 29.1734 16.1066 28.009C16.1066 26.8445 17.0577 25.8934 18.2222 25.8934C19.3866 25.8934 20.3377 26.8445 20.3377 28.009ZM17.8933 20.009C17.8933 18.8445 18.8444 17.8934 20.0089 17.8934C21.1733 17.8934 22.1244 18.8445 22.1244 20.009C22.1244 21.1734 21.1733 22.1245 20.0089 22.1245C18.8444 22.1245 17.8933 21.1734 17.8933 20.009ZM28.0089 29.2357C27.3333 29.2357 26.7822 28.6845 26.7822 28.009C26.7822 27.3334 27.3333 26.7823 28.0089 26.7823C28.6844 26.7823 29.2355 27.3334 29.2355 28.009C29.2355 28.6845 28.6844 29.2357 28.0089 29.2357Z" fill="#151515"/>
            </svg>
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">Data assets</Title>
            <Content component="p" style={{ color: '#6a6e73', marginTop: '4px' }}>
              Discover, manage, and connect enterprise data resources for your project. Browse curated catalogs, view registered schemas and datasets, or manage namespace-scoped data connections.
            </Content>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Toolbar style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '8px' }}>
          <ToolbarContent>
            <ToolbarItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem><RhFolderIcon style={{ fontSize: '18px', verticalAlign: 'middle' }} /></FlexItem>
                    <FlexItem>Project</FlexItem>
                  </Flex>
                </FlexItem>
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
                    <Button variant="link" component={(props) => <Link {...props} to={`/ai-hub/data/collections?project=${selectedProject}&tab=assets`} />}>
                      Go to <RhFolderIcon style={{ fontSize: '18px', marginLeft: '4px', marginRight: '4px', verticalAlign: 'middle' }} />{' '}<strong>{selectedProject}</strong>
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Tabs activeKey={activeTab} onSelect={handleTabSelect} style={{ paddingLeft: '16px' }}>
          <Tab eventKey="assets" title={<TabTitleText>Registry</TabTitleText>}>
            {isDetailView ? (
              <AssetDetailContent
                project={selectedProject}
                namespace={detailNamespace!}
                assetName={detailAssetName!}
                isVolume={isVolume}
                detailQuery={detailQuery}
                onEdit={() => {
                  const asset = detailQuery.data;
                  if (asset) {
                    setEditTarget({
                      name: detailAssetName!,
                      namespace: detailNamespace!,
                      description: asset.description || '',
                      format: asset.format || '',
                      location: asset.location || '',
                      connectionRef: asset.connection_ref || '',
                      isVolume,
                      properties: asset.properties || {},
                    } as TableAsset);
                  }
                }}
                onDelete={() => setDeleteTarget({ name: detailAssetName!, namespace: detailNamespace!, isVolume })}
              />
            ) : !selectedProject ? (
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
                      <Popper
                        trigger={
                          <MenuToggle
                            ref={collectionToggleRef}
                            onClick={() => { setIsCollectionOpen(!isCollectionOpen); setCollectionFilter(''); }}
                            isExpanded={isCollectionOpen}
                            style={{ minWidth: '160px' }}
                          >
                            <FilterIcon style={{ marginRight: '6px' }} />
                            Collections
                            {collections.length > 0 && (
                              <Badge isRead style={{ marginLeft: '8px' }}>{selectedCollections.length}</Badge>
                            )}
                          </MenuToggle>
                        }
                        popper={
                          <Menu ref={collectionMenuRef} style={{ minWidth: '280px' }}>
                            <MenuSearch>
                              <MenuSearchInput>
                                <SearchInput
                                  placeholder="Find by name"
                                  value={collectionFilter}
                                  onChange={(_e, v) => setCollectionFilter(v)}
                                  onClear={() => setCollectionFilter('')}
                                  aria-label="Filter collections"
                                />
                              </MenuSearchInput>
                            </MenuSearch>
                            <Divider />
                            <MenuContent>
                              <MenuList>
                                <MenuItem
                                  itemId="all-sources"
                                  isSelected={isAllSources}
                                  icon={isAllSources ? <CheckIcon color="var(--pf-t--global--icon--color--brand--default)" /> : undefined}
                                  onClick={() => setSelectedCollections([...allCollectionNames])}
                                >
                                  All data sources
                                </MenuItem>
                              </MenuList>
                              <Divider />
                              <MenuList>
                                <MenuItem isDisabled style={{ fontSize: '12px', fontWeight: 600, color: '#6a6e73', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Collections
                                </MenuItem>
                                {filteredCollections.map((c) => {
                                  const sourceCount = (c.tableCount || 0) + (c.volumeCount || 0);
                                  return (
                                    <MenuItem
                                      key={c.name}
                                      itemId={c.name}
                                      isSelected={selectedCollections.includes(c.name)}
                                      onClick={() => toggleCollection(c.name)}
                                      description={c.description || undefined}
                                    >
                                      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                                        <FlexItem>{c.name}</FlexItem>
                                        <FlexItem>
                                          <Badge>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</Badge>
                                        </FlexItem>
                                      </Flex>
                                    </MenuItem>
                                  );
                                })}
                              </MenuList>
                            </MenuContent>
                            <Divider />
                            <MenuFooter>
                              <Button variant="link" isInline onClick={() => { setIsCollectionOpen(false); setShowCreateCollection(true); }}>
                                Create new collection
                              </Button>
                            </MenuFooter>
                          </Menu>
                        }
                        isVisible={isCollectionOpen}
                        onDocumentClick={(event) => {
                          if (
                            !collectionToggleRef.current?.contains(event?.target as Node) &&
                            !collectionMenuRef.current?.contains(event?.target as Node)
                          ) {
                            setIsCollectionOpen(false);
                          }
                        }}
                      />
                    </ToolbarItem>
                    <ToolbarItem>
                      <SearchInput
                        placeholder="Find by name"
                        value={nameFilter}
                        onChange={(_e, v) => setNameFilter(v)}
                        onClear={() => setNameFilter('')}
                      />
                    </ToolbarItem>
                    <ToolbarItem>
                      <Button variant="primary" onClick={() => setShowRegister(true)}>
                        Register data
                      </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                      <Button variant="secondary" onClick={() => setShowCreateCollection(true)}>
                        Create collection
                      </Button>
                    </ToolbarItem>
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
                        {isAllSources
                          ? `All ${collections.length} collections`
                          : `${selectedCollections.length} of ${collections.length} collections`}
                      </span>
                    </FlexItem>
                    {!isAllSources && (
                      <FlexItem>
                        <Button variant="link" isInline onClick={() => setSelectedCollections([...allCollectionNames])}>
                          Select all
                        </Button>
                      </FlexItem>
                    )}
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
                        const detailUrl = `/ai-hub/data/collections/${asset.namespace}/${asset.name}?project=${selectedProject}${asset.isVolume ? '&type=volume' : ''}`;
                        return (
                          <Tr key={rowKey}>
                            <Td dataLabel="Name">
                              <div>
                                <Link to={detailUrl} style={{ fontWeight: 600 }}>{asset.name}</Link>
                              </div>
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
                                <Link to={`/ai-hub/data/connections/${asset.connectionRef}?project=${selectedProject}`}>
                                  {asset.connectionRef}
                                </Link>
                              ) : '—'}
                            </Td>
                            <Td dataLabel="Tags">
                              <LabelGroup numLabels={2}>
                                {Object.entries(asset.properties || {}).map(([k, v]) => (
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
                                    onClick={() => setOpenKebab(openKebab === rowKey ? null : rowKey)}
                                    isExpanded={openKebab === rowKey}
                                  >
                                    <EllipsisVIcon />
                                  </MenuToggle>
                                )}
                                popperProps={{ position: 'right' }}
                              >
                                <DropdownList>
                                  <DropdownItem key="edit" onClick={() => { setEditTarget(asset); setOpenKebab(null); }}>
                                    Edit
                                  </DropdownItem>
                                  <DropdownItem key="delete" onClick={() => {
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
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </PageSection>
            )}
          </Tab>
          <Tab eventKey="connections" title={<TabTitleText>Connections</TabTitleText>}>
            <ConnectionsTab project={selectedProject || ''} connectionName={detailConnectionName} />
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
        <Modal variant={ModalVariant.small} isOpen onClose={() => { setDeleteTarget(null); setDeleteConfirm(''); }} aria-label="Delete asset">
          <ModalHeader title={`Permanently delete ${deleteTarget.isVolume ? 'volume' : 'table'}?`} />
          <ModalBody>
            <p style={{ marginBottom: '16px' }}><strong>{deleteTarget.name}</strong> and its data will be lost forever.</p>
            <FormGroup label="Type DELETE to confirm:" fieldId="delete-confirm">
              <TextInput id="delete-confirm" value={deleteConfirm} onChange={(_e, v) => setDeleteConfirm(v)} placeholder="DELETE" />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteTable.isPending || deleteVolume.isPending} isDisabled={deleteConfirm !== 'DELETE'}>Delete</Button>
            <Button variant="link" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Register modal */}
      {showRegister && (
        <RegisterDataModal project={selectedProject} namespace={registerNamespace} connections={connections} onClose={() => setShowRegister(false)} />
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

const AssetDetailContent: React.FC<{
  project: string;
  namespace: string;
  assetName: string;
  isVolume: boolean;
  detailQuery: ReturnType<typeof useTableDetail>;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ project, namespace, assetName, isVolume, detailQuery, onEdit, onDelete }) => {
  const [detailKebabOpen, setDetailKebabOpen] = React.useState(false);
  const asset = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <PageSection>
        <Bullseye style={{ minHeight: '400px' }}><Spinner /></Bullseye>
      </PageSection>
    );
  }

  if (!asset) {
    return (
      <PageSection>
        <Content>Asset not found.</Content>
      </PageSection>
    );
  }

  const description = asset.description || asset.properties?.description || '';
  const format = asset.format || asset.properties?.format || '';
  const location = asset.location || '';
  const connectionRef = asset.connection_ref || asset.properties?.['connection-ref'] || '';
  const columns = asset.columns || [];

  const tags = { ...(asset.tags || {}), ...(asset.properties || {}) };
  const metaKeys = ['description', 'format', 'connection-ref', 'volume_type', 'location'];
  const displayTags = Object.entries(tags).filter(([k]) => !metaKeys.includes(k));

  return (
    <>
      <PageSection style={{ paddingBottom: 0 }}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={`/ai-hub/data/collections?project=${project}&tab=assets`}>
              Data Registry &ndash; {project}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{assetName}</BreadcrumbItem>
        </Breadcrumb>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ marginTop: '12px' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">{assetName}</Title>
          </FlexItem>
          <FlexItem>
            <Dropdown
              isOpen={detailKebabOpen}
              onOpenChange={setDetailKebabOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="plain"
                  onClick={() => setDetailKebabOpen(!detailKebabOpen)}
                  isExpanded={detailKebabOpen}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              popperProps={{ position: 'right' }}
            >
              <DropdownList>
                <DropdownItem key="edit" onClick={() => { setDetailKebabOpen(false); onEdit(); }}>Edit</DropdownItem>
                <DropdownItem key="delete" onClick={() => { setDetailKebabOpen(false); onDelete(); }}>Delete</DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Tabs activeKey="overview" style={{ paddingLeft: '24px' }}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <PageSection>
              <Grid hasGutter>
                <GridItem span={8}>
                  <Card>
                    <CardTitle>Asset details</CardTitle>
                    <CardBody>
                      {displayTags.length > 0 && (
                        <>
                          <Title headingLevel="h4" size="md" style={{ marginBottom: '8px' }}>Labels</Title>
                          <LabelGroup>
                            {displayTags.map(([k, v]) => (
                              <Label key={k} variant="outline">{k}: {v}</Label>
                            ))}
                          </LabelGroup>
                          <Divider style={{ marginTop: '16px', marginBottom: '16px' }} />
                        </>
                      )}

                      {description && (
                        <>
                          <Title headingLevel="h4" size="md" style={{ marginBottom: '8px' }}>Description</Title>
                          <Content component="p">{description}</Content>
                          <Divider style={{ marginTop: '16px', marginBottom: '16px' }} />
                        </>
                      )}

                      <DescriptionList isHorizontal>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Asset type</DescriptionListTerm>
                          <DescriptionListDescription>{isVolume ? 'Volume' : 'Table'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        {format && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Format</DescriptionListTerm>
                            <DescriptionListDescription>
                              <Label isCompact variant="outline" color={FORMAT_COLORS[format] || 'grey'}>{format}</Label>
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                        {location && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Location</DescriptionListTerm>
                            <DescriptionListDescription style={{ wordBreak: 'break-all' }}>{location}</DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                        {connectionRef && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Connection</DescriptionListTerm>
                            <DescriptionListDescription>
                              <Link to={`/ai-hub/data/connections/${connectionRef}?project=${project}`}>{connectionRef}</Link>
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                        <DescriptionListGroup>
                          <DescriptionListTerm>Collection</DescriptionListTerm>
                          <DescriptionListDescription>{namespace}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={4}>
                  <Card>
                    <CardTitle>Schema</CardTitle>
                    <CardBody>
                      {columns.length > 0 ? (
                        <>
                          <Content component="p" style={{ marginBottom: '12px', color: '#6a6e73' }}>
                            {columns.length} column{columns.length !== 1 ? 's' : ''}
                          </Content>
                          <Table variant="compact" aria-label="Schema columns">
                            <Thead>
                              <Tr>
                                <Th>Name</Th>
                                <Th>Type</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {columns.map((col, i) => (
                                <Tr key={i}>
                                  <Td>{col.name}</Td>
                                  <Td><Label isCompact variant="outline">{col.type}</Label></Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </>
                      ) : (
                        <Content component="p" style={{ color: '#6a6e73' }}>No schema available</Content>
                      )}
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>
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

export default DataRegistryPage;
