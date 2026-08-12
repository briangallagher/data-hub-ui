import React from 'react';
import {
  PageSection,
  Title,
  Content,
  Tabs,
  Tab,
  TabTitleText,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Flex,
  FlexItem,
  MenuToggle,
  Select,
  SelectOption,
  SelectList,
  SearchInput,
  Divider,
  EmptyState,
  EmptyStateBody,
  Icon,
  Gallery,
  GalleryItem,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Label,
  LabelGroup,
  ToggleGroup,
  ToggleGroupItem,
  Button,
  Checkbox,
  Switch,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import {
  AwsIcon,
  LinkIcon,
  SearchIcon,
  ArrowRightIcon,
  SnowflakeIcon,
  GoogleIcon,
  MicrosoftIcon,
} from '@patternfly/react-icons';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useK8sNamespaces } from './useCatalogApi';
import ConnectionsTab from './ConnectionsTab';

const RhFolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ style, ...props }) => (
  <svg fill="currentColor" viewBox="0 0 36 36" aria-hidden="true" role="img" width="1em" height="1em" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props}>
    <path d="M31 9.38h-3.71l-.52-2.47a.62.62 0 0 0-.61-.49h-7.32a.62.62 0 0 0-.61.49l-.52 2.47h-9.5a.62.62 0 0 0-.62.62v15a.63.63 0 0 0 1.25 0V10.62h9.37a.61.61 0 0 0 .61-.49l.53-2.46h6.3l.53 2.46a.61.61 0 0 0 .61.49h3.59v17.76H5.62V10a.62.62 0 0 0-1.24 0v19a.62.62 0 0 0 .62.62h26a.62.62 0 0 0 .62-.62V10a.62.62 0 0 0-.62-.62Z" />
  </svg>
);

const DataGraphIcon: React.FC = () => (
  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#ECE6FF"/>
    <path d="M28 25.6712C27.5555 25.6712 27.1466 25.8045 26.8 26.0179L22.64 21.8579C23.0044 21.3334 23.2266 20.7023 23.2266 20.009C23.2266 19.9734 23.2177 19.929 23.2177 19.8934L25.0489 19.5023C25.5466 20.649 26.6844 21.449 28.0089 21.449C29.7866 21.449 31.2266 20.0001 31.2266 18.2312C31.2266 16.4623 29.7777 15.0134 28.0089 15.0134C26.24 15.0134 24.7911 16.4623 24.7911 18.2312C24.7911 18.2934 24.8089 18.3557 24.8089 18.4179L22.9955 18.8001C22.6577 17.9557 21.9644 17.2979 21.1111 16.9868L21.8666 13.4401C23.12 13.4045 24.1244 12.3734 24.1244 11.1112C24.1244 9.84899 23.0755 8.78233 21.7955 8.78233C20.5155 8.78233 19.4666 9.83122 19.4666 11.1112C19.4666 12.0357 20.0089 12.8268 20.7911 13.2001L20.0355 16.7734C19.3511 16.7734 18.7111 16.9957 18.1866 17.3601L14.6666 13.8401C15.0311 13.3157 15.2533 12.6845 15.2533 11.9912C15.2533 10.2134 13.8044 8.77344 12.0355 8.77344C10.2666 8.77344 8.81775 10.2223 8.81775 11.9912C8.81775 13.7601 10.2666 15.209 12.0355 15.209C12.72 15.209 13.36 14.9868 13.8844 14.6223L17.4044 18.1423C17.04 18.6668 16.8177 19.2979 16.8177 19.9912C16.8177 20.0268 16.8266 20.0712 16.8266 20.1068L14.0889 20.6845C13.6977 19.9468 12.9244 19.4312 12.0355 19.4312C10.7466 19.4312 9.70664 20.4801 9.70664 21.7601C9.70664 23.0401 10.7555 24.089 12.0355 24.089C13.3155 24.089 14.3644 23.0401 14.3644 21.7601L17.0489 21.1823C17.36 21.9557 17.9644 22.5779 18.7289 22.9245L18.3377 24.7734C18.3377 24.7734 18.2844 24.7734 18.2577 24.7734C16.48 24.7734 15.04 26.2223 15.04 27.9912C15.04 29.7601 16.4889 31.209 18.2577 31.209C20.0266 31.209 21.4755 29.7601 21.4755 27.9912C21.4755 26.6312 20.6222 25.4668 19.4222 24.9957L19.8044 23.1912C19.8755 23.1912 19.9555 23.2179 20.0266 23.2179C20.7111 23.2179 21.3511 22.9957 21.8755 22.6312L26.0355 26.7912C25.8222 27.1468 25.6889 27.5557 25.6889 27.9912C25.6889 29.2801 26.7377 30.3201 28.0177 30.3201C29.2977 30.3201 30.3466 29.2712 30.3466 27.9912C30.3466 26.7112 29.2977 25.6623 28.0177 25.6623L28 25.6712ZM28 16.1157C29.1644 16.1157 30.1155 17.0668 30.1155 18.2312C30.1155 19.3957 29.1644 20.3468 28 20.3468C26.8355 20.3468 25.8844 19.3957 25.8844 18.2312C25.8844 17.0668 26.8355 16.1157 28 16.1157ZM20.5511 11.1201C20.5511 10.4445 21.1022 9.89344 21.7777 9.89344C22.4533 9.89344 23.0044 10.4445 23.0044 11.1201C23.0044 11.7957 22.4533 12.3468 21.7777 12.3468C21.1022 12.3468 20.5511 11.7957 20.5511 11.1201ZM12 14.1245C10.8355 14.1245 9.88442 13.1734 9.88442 12.009C9.88442 10.8445 10.8355 9.89344 12 9.89344C13.1644 9.89344 14.1155 10.8445 14.1155 12.009C14.1155 13.1734 13.1644 14.1245 12 14.1245ZM12 23.0134C11.3244 23.0134 10.7733 22.4623 10.7733 21.7868C10.7733 21.1112 11.3244 20.5601 12 20.5601C12.6755 20.5601 13.2266 21.1112 13.2266 21.7868C13.2266 22.4623 12.6755 23.0134 12 23.0134ZM20.3377 28.009C20.3377 29.1734 19.3866 30.1245 18.2222 30.1245C17.0577 30.1245 16.1066 29.1734 16.1066 28.009C16.1066 26.8445 17.0577 25.8934 18.2222 25.8934C19.3866 25.8934 20.3377 26.8445 20.3377 28.009ZM17.8933 20.009C17.8933 18.8445 18.8444 17.8934 20.0089 17.8934C21.1733 17.8934 22.1244 18.8445 22.1244 20.009C22.1244 21.1734 21.1733 22.1245 20.0089 22.1245C18.8444 22.1245 17.8933 21.1734 17.8933 20.009ZM28.0089 29.2357C27.3333 29.2357 26.7822 28.6845 26.7822 28.009C26.7822 27.3334 27.3333 26.7823 28.0089 26.7823C28.6844 26.7823 29.2355 27.3334 29.2355 28.009C29.2355 28.6845 28.6844 29.2357 28.0089 29.2357Z" fill="#151515"/>
  </svg>
);

const PostgresIcon: React.FC = () => (
  <svg width="1em" height="1em" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M28.7 14.2c-.3-1.1-.9-2-1.7-2.7.1-.5.2-1 .2-1.5 0-2.2-1.2-4.2-3.1-5.3-.6-.4-1.3-.6-2-.8C21.1 2.7 19.6 2 18 2c-1.8 0-3.5.8-4.6 2.2-.6-.1-1.2-.2-1.8-.2-3.3 0-6 2.7-6 6 0 .5.1 1 .2 1.5-.8.7-1.4 1.6-1.7 2.7-.2.8-.3 1.6-.3 2.4 0 2.4 1 4.6 2.8 6.1.1 2 .9 3.8 2.3 5.2 1.5 1.5 3.4 2.3 5.5 2.3.7 0 1.4-.1 2.1-.3.7.4 1.5.6 2.3.6h.2c.8 0 1.6-.2 2.3-.6.7.2 1.4.3 2.1.3 2.1 0 4-.8 5.5-2.3 1.4-1.4 2.2-3.2 2.3-5.2 1.7-1.5 2.8-3.7 2.8-6.1 0-.8-.1-1.6-.3-2.4zM18 4c1 0 2 .4 2.8 1.2-.9.2-1.8.6-2.5 1.2-.8-.6-1.7-1-2.6-1.2C16.5 4.4 17.2 4 18 4zm-6.4 2c.6 0 1.1.1 1.6.3-1.3 1-2.2 2.6-2.4 4.3-.4.1-.7.3-1 .5-.1-.4-.2-.7-.2-1.1 0-2.2 1.8-4 4-4zm-3.8 8.6c.2-.7.6-1.3 1.2-1.7.5.8 1.2 1.4 2.1 1.8-.1.5-.1 1.1-.1 1.7 0 1.5.4 2.9 1 4.1-1-.4-1.9-1.1-2.5-2-.9-.5-1.5-1.4-1.8-2.4-.1-.5-.1-1-.1-1.5 0-.3 0-.7.2-1zm6.6 13.6c-1.7 0-3.2-.7-4.4-1.8-1-1-1.6-2.3-1.8-3.7.6.3 1.3.5 2 .5.4 0 .9-.1 1.3-.2.9 1.3 2.2 2.3 3.7 2.8 1 .3 2 .5 3.1.5-.1 0-.2.1-.3.1-.5.1-1.1.2-1.6.2-.7-.1-1.4-.2-2-.4zm6.6-.6c-.5 0-1-.1-1.5-.3.5-.5.9-1.1 1.2-1.7h.6c.4 0 .8-.1 1.2-.2-.5.9-1 1.6-1.5 2.2zm3.4-1.4c-1.2 1.2-2.7 1.8-4.4 1.8-.3 0-.5 0-.8-.1.7-.8 1.3-1.8 1.7-2.9.7-.3 1.3-.7 1.8-1.2.3.1.6.2.9.2.7 0 1.4-.2 2-.5-.2 1.4-.8 2.7-1.8 3.7l-.2-.2.8.8-.8-.8.8.8zm3.7-7.6c-.3 1-.9 1.9-1.8 2.4-.6.9-1.5 1.6-2.5 2 .6-1.2 1-2.6 1-4.1 0-.6 0-1.2-.1-1.7.9-.4 1.6-1 2.1-1.8.6.4 1 1 1.2 1.7.1.3.2.7.2 1 0 .2 0 .4-.1.5z" fill="#336791"/>
  </svg>
);

const MySQLIcon: React.FC = () => (
  <svg width="1em" height="1em" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M18 4C10.3 4 4 8.5 4 14v8c0 5.5 6.3 10 14 10s14-4.5 14-10v-8c0-5.5-6.3-10-14-10zm0 2c6.6 0 12 3.6 12 8s-5.4 8-12 8S6 18.4 6 14s5.4-8 12-8zm0 18c6.6 0 12 3.6 12 8H6c0-4.4 5.4-8 12-8z" fill="#00758F"/>
    <path d="M18 6c-6.6 0-12 3.6-12 8s5.4 8 12 8 12-3.6 12-8-5.4-8-12-8zm-5 5h2l1.5 4L18 11h2v6h-1.5v-4l-1.5 4h-1l-1.5-4v4H13v-6zm9 0h1.5v4.5H26V11h-2v6h-1.5v-4.5z" fill="#F29111"/>
  </svg>
);

const MongoDBIcon: React.FC = () => (
  <svg width="1em" height="1em" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M18.5 4.2c-.2-.2-.3-.2-.5-.2s-.3 0-.5.2C14.3 7.8 12 12.5 12 17c0 3.1 1.3 5.9 3.4 7.9.3.3.6.5.9.7.2.1.3.2.5.3l.2 5.1h2l.2-5.1c.2-.1.3-.2.5-.3.3-.2.6-.4.9-.7C22.7 22.9 24 20.1 24 17c0-4.5-2.3-9.2-5.5-12.8z" fill="#4FAA41"/>
    <path d="M18 4c-.1 0-.2.1-.3.1C17.9 4.1 18 4 18 4zm0 0v27h.2l.2-5.1c.2-.1.3-.2.5-.3.3-.2.6-.4.9-.7C22.7 22.9 24 20.1 24 17c0-4.5-2.3-9.2-5.5-12.8-.2-.2-.3-.2-.5-.2z" fill="#3F9838"/>
  </svg>
);

type SourceTier = 'redhat' | 'partner' | 'other';

interface CatalogConnectionType {
  name: string;
  description: string;
  icon: React.ComponentType;
  source: SourceTier;

  category: string;
  license: string;
  labels: string[];
}

const CONNECTION_TYPE_CATALOG: CatalogConnectionType[] = [
  {
    name: 'S3 compatible object storage',
    description: 'Connect to Amazon S3, MinIO, Ceph, or any S3-compatible object storage to access buckets and datasets.',
    icon: AwsIcon,
    source: 'redhat',
    category: 'Object storage',
    license: 'Apache 2.0',
    labels: ['S3', 'MinIO', 'Ceph'],
  },
  {
    name: 'URI',
    description: 'Connect to a data source using a generic URI endpoint. Supports HTTP, HTTPS, and custom schemes.',
    icon: LinkIcon,
    source: 'redhat',
    category: 'General',
    license: 'Apache 2.0',
    labels: ['HTTP', 'HTTPS'],
  },
  {
    name: 'Snowflake',
    description: 'Connect to Snowflake data warehouse for cloud-native analytics and large-scale data processing.',
    icon: SnowflakeIcon,
    source: 'partner',
    category: 'Data warehouse',
    license: 'Proprietary',
    labels: ['Cloud', 'Analytics', 'SQL'],
  },
  {
    name: 'Google Cloud Storage',
    description: 'Connect to Google Cloud Storage buckets for object storage and data lake workloads.',
    icon: GoogleIcon,
    source: 'partner',
    category: 'Object storage',
    license: 'Apache 2.0',
    labels: ['GCS', 'Cloud'],
  },
  {
    name: 'Azure Blob Storage',
    description: 'Connect to Microsoft Azure Blob Storage for scalable cloud object storage and data lake integration.',
    icon: MicrosoftIcon,
    source: 'partner',
    category: 'Object storage',
    license: 'MIT',
    labels: ['Azure', 'Cloud', 'Blob'],
  },
  {
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL databases for structured data access, query execution, and schema inspection.',
    icon: PostgresIcon,
    source: 'other',
    category: 'Database',
    license: 'PostgreSQL License',
    labels: ['SQL', 'Relational'],
  },
  {
    name: 'MySQL',
    description: 'Connect to MySQL or MariaDB databases for relational data access and management.',
    icon: MySQLIcon,
    source: 'other',
    category: 'Database',
    license: 'GPL 2.0',
    labels: ['SQL', 'Relational'],
  },
  {
    name: 'MongoDB',
    description: 'Connect to MongoDB for document-oriented data access, aggregation pipelines, and Atlas cloud databases.',
    icon: MongoDBIcon,
    source: 'other',
    category: 'Database',
    license: 'Apache 2.0',
    labels: ['NoSQL', 'Document'],
  },
];

const SOURCE_TIERS: { key: SourceTier; heading: string; description: string }[] = [
  { key: 'redhat', heading: 'Red Hat connections', description: 'Official Red Hat connection types with full support.' },
  { key: 'partner', heading: 'Red Hat partner connections', description: 'A collection of Red Hat partner connection types.' },
  { key: 'other', heading: 'Other connections', description: 'A broad collection of community and third-party connection types.' },
];

const SOURCE_LABELS: Record<SourceTier, string> = {
  redhat: 'Red Hat',
  partner: 'Partner supported',
  other: 'Other',
};

const ConnectionCatalog: React.FC = () => {
  const userId = 'admin';
  const [catalogFilter, setCatalogFilter] = React.useState('');
  const [activeTier, setActiveTier] = React.useState<'all' | SourceTier>('all');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [selectedLicenses, setSelectedLicenses] = React.useState<string[]>([]);
  const [showInstalledOnly, setShowInstalledOnly] = React.useState(false);
  const [drawerExpanded, setDrawerExpanded] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<CatalogConnectionType | null>(null);
  const drawerRef = React.useRef<HTMLSpanElement>(null);

  const onCardClick = (ct: CatalogConnectionType) => {
    setSelectedItem(ct);
    setDrawerExpanded(true);
  };

  const onDrawerClose = () => {
    setDrawerExpanded(false);
  };

  const onDrawerExpand = () => {
    drawerRef.current?.focus();
  };

  const allCategories = React.useMemo(() =>
    Array.from(new Set(CONNECTION_TYPE_CATALOG.map((c) => c.category))).sort(),
    [],
  );
  const allLicenses = React.useMemo(() =>
    Array.from(new Set(CONNECTION_TYPE_CATALOG.map((c) => c.license))).sort(),
    [],
  );

  const filteredTypes = React.useMemo(() => {
    let result = CONNECTION_TYPE_CATALOG;
    if (activeTier !== 'all') {
      result = result.filter((t) => t.source === activeTier);
    }
    if (catalogFilter) {
      const q = catalogFilter.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.labels.some((l) => l.toLowerCase().includes(q)),
      );
    }
    if (selectedCategories.length > 0) {
      result = result.filter((t) => selectedCategories.includes(t.category));
    }
    if (selectedLicenses.length > 0) {
      result = result.filter((t) => selectedLicenses.includes(t.license));
    }
    return result;
  }, [catalogFilter, activeTier, selectedCategories, selectedLicenses]);

  const toggleCheckbox = (value: string, selected: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const tiersToShow = activeTier === 'all' ? SOURCE_TIERS : SOURCE_TIERS.filter((t) => t.key === activeTier);

  const renderSection = (tier: typeof SOURCE_TIERS[number]) => {
    const items = filteredTypes.filter((t) => t.source === tier.key);
    if (items.length === 0) return null;
    return (
      <div key={tier.key} style={{ marginBottom: 'var(--pf-t--global--spacer--xl)' }}>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h3" size="lg">{tier.heading}</Title>
            <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginTop: 'var(--pf-t--global--spacer--xs)' }}>
              {tier.description}
            </Content>
          </FlexItem>
          {activeTier === 'all' && items.length > 4 && (
            <FlexItem>
              <Button variant="link" onClick={() => setActiveTier(tier.key)}>
                Show all {tier.heading} <ArrowRightIcon />
              </Button>
            </FlexItem>
          )}
        </Flex>
        <Gallery hasGutter minWidths={{ default: '280px' }} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
          {(activeTier === 'all' ? items.slice(0, 4) : items).map((ct) => (
            <GalleryItem key={ct.name}>
              <Card isFullHeight isSelected={selectedItem?.name === ct.name && drawerExpanded} onClick={() => onCardClick(ct)} style={{ cursor: 'pointer' }}>
                <CardHeader>
                  <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ width: '100%' }}>
                    <FlexItem>
                      <Icon size="xl"><ct.icon /></Icon>
                    </FlexItem>
                    <FlexItem>
                      <Label isCompact color="grey">{SOURCE_LABELS[ct.source]}</Label>
                    </FlexItem>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <span style={{ fontSize: 'var(--pf-t--global--font--size--md)', fontWeight: 600, color: 'var(--pf-t--global--text--color--link--default)' }}>
                    {ct.name}
                  </span>
                  <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--sm)', marginTop: 'var(--pf-t--global--spacer--xs)' }}>
                    {ct.description}
                  </Content>
                </CardBody>
                <CardFooter>
                  <LabelGroup numLabels={3}>
                    {ct.labels.map((l) => (
                      <Label key={l} isCompact variant="outline">{l}</Label>
                    ))}
                  </LabelGroup>
                </CardFooter>
              </Card>
            </GalleryItem>
          ))}
        </Gallery>
      </div>
    );
  };

  const drawerPanelContent = (
    <DrawerPanelContent widths={{ default: 'width_33' }}>
      <DrawerHead>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          {selectedItem && (
            <>
              <FlexItem>
                <Icon size="xl"><selectedItem.icon /></Icon>
              </FlexItem>
              <FlexItem>
                <Title headingLevel="h2" size="xl">
                  <span tabIndex={drawerExpanded ? 0 : -1} ref={drawerRef}>
                    {selectedItem.name}
                  </span>
                </Title>
              </FlexItem>
              <FlexItem>
                <Label isCompact color="grey">{SOURCE_LABELS[selectedItem.source]}</Label>
              </FlexItem>
            </>
          )}
        </Flex>
        <DrawerActions>
          <DrawerCloseButton onClick={onDrawerClose} />
        </DrawerActions>
      </DrawerHead>
      {selectedItem && (
        <DrawerPanelBody>
          <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 'var(--pf-t--global--spacer--lg)' }}>
            {selectedItem.description}
          </Content>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Category</DescriptionListTerm>
              <DescriptionListDescription>{selectedItem.category}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>License</DescriptionListTerm>
              <DescriptionListDescription>{selectedItem.license}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Source</DescriptionListTerm>
              <DescriptionListDescription>{SOURCE_LABELS[selectedItem.source]}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tags</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {selectedItem.labels.map((l) => (
                    <Label key={l} isCompact variant="outline">{l}</Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>6/15/2026, 10:32:00 AM by {userId}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Last modified</DescriptionListTerm>
              <DescriptionListDescription>6/15/2026, 10:32:00 AM by {userId}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
          <Button variant="primary" style={{ marginTop: 'var(--pf-t--global--spacer--xl)' }}>
            Create connection
          </Button>
        </DrawerPanelBody>
      )}
    </DrawerPanelContent>
  );

  return (
    <PageSection>
      <Drawer isExpanded={drawerExpanded} onExpand={onDrawerExpand}>
        <DrawerContent panelContent={drawerPanelContent}>
          <DrawerContentBody>
            <Flex alignItems={{ default: 'alignItemsStretch' }} style={{ minHeight: 'calc(100vh - 280px)' }}>
              <FlexItem style={{ minWidth: '220px', maxWidth: '260px', paddingRight: 'var(--pf-t--global--spacer--lg)', borderRight: 'var(--pf-t--global--border--width--divider--default) solid var(--pf-t--global--border--color--default)' }}>
                <div style={{ borderBottom: 'var(--pf-t--global--border--width--divider--default) solid var(--pf-t--global--border--color--default)', paddingBottom: 'var(--pf-t--global--spacer--md)', marginBottom: 'var(--pf-t--global--spacer--md)' }}>
                  <Title headingLevel="h4" size="md" style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}>Category</Title>
                  {allCategories.map((cat) => (
                    <Checkbox
                      key={cat}
                      id={`cat-${cat}`}
                      label={cat}
                      isChecked={selectedCategories.includes(cat)}
                      onChange={() => toggleCheckbox(cat, selectedCategories, setSelectedCategories)}
                      style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}
                    />
                  ))}
                </div>
                <div>
                  <Title headingLevel="h4" size="md" style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}>License</Title>
                  {allLicenses.map((lic) => (
                    <Checkbox
                      key={lic}
                      id={`lic-${lic}`}
                      label={lic}
                      isChecked={selectedLicenses.includes(lic)}
                      onChange={() => toggleCheckbox(lic, selectedLicenses, setSelectedLicenses)}
                      style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}
                    />
                  ))}
                </div>
              </FlexItem>

              <FlexItem grow={{ default: 'grow' }} style={{ paddingLeft: 'var(--pf-t--global--spacer--lg)' }}>
                <Flex alignItems={{ default: 'alignItemsCenter' }} style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
                  <FlexItem>
                    <SearchInput
                      placeholder="Search by name..."
                      value={catalogFilter}
                      onChange={(_e, v) => setCatalogFilter(v)}
                      onSearch={(_e, v) => setCatalogFilter(v)}
                      onClear={() => setCatalogFilter('')}
                      style={{ width: '300px' }}
                    />
                  </FlexItem>
                  <FlexItem spacer={{ default: 'spacerLg' }}>
                    <Switch
                      id="show-installed-only"
                      label="Show only installed"
                      isChecked={showInstalledOnly}
                      onChange={(_e, checked) => setShowInstalledOnly(checked)}
                    />
                  </FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    <Button variant="primary">Create connection</Button>
                  </FlexItem>
                </Flex>

                <ToggleGroup aria-label="Connection source filter" style={{ marginBottom: 'var(--pf-t--global--spacer--lg)' }}>
                  <ToggleGroupItem
                    text="All connections"
                    isSelected={activeTier === 'all'}
                    onChange={() => setActiveTier('all')}
                  />
                  <ToggleGroupItem
                    text="Red Hat connections"
                    isSelected={activeTier === 'redhat'}
                    onChange={() => setActiveTier('redhat')}
                  />
                  <ToggleGroupItem
                    text="Red Hat partner connections"
                    isSelected={activeTier === 'partner'}
                    onChange={() => setActiveTier('partner')}
                  />
                  <ToggleGroupItem
                    text="Other connections"
                    isSelected={activeTier === 'other'}
                    onChange={() => setActiveTier('other')}
                  />
                </ToggleGroup>

                {filteredTypes.length === 0 ? (
                  <EmptyState titleText="No results found" icon={SearchIcon}>
                    <EmptyStateBody>No connection types match your filter. Try adjusting your search.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  tiersToShow.map((tier) => renderSection(tier))
                )}
              </FlexItem>
            </Flex>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </PageSection>
  );
};

const ConnectionsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const pathPrefix = '/ai-hub/connections/';
  const connectionName = location.pathname.startsWith(pathPrefix)
    ? decodeURIComponent(location.pathname.slice(pathPrefix.length))
    : undefined;
  const isConnectionDetailView = !!connectionName;

  const activeTab = isConnectionDetailView ? 'connections' : (searchParams.get('tab') || 'connections');
  const selectedProject = searchParams.get('project') || '';

  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [projectFilter, setProjectFilter] = React.useState('');

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

  const filteredProjects = React.useMemo(() => {
    if (!projectFilter) return projects;
    const q = projectFilter.toLowerCase();
    return projects.filter((ns) => ns.name.toLowerCase().includes(q));
  }, [projects, projectFilter]);

  React.useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSearchParams({ tab: activeTab, project: projects[0].name });
    }
  }, [projects, selectedProject, activeTab, setSearchParams]);

  const handleTabSelect = (_: React.MouseEvent, tabKey: string | number) => {
    const params = new URLSearchParams();
    params.set('tab', String(tabKey));
    if (selectedProject) params.set('project', selectedProject);
    navigate(`/ai-hub/connections?${params.toString()}`);
  };

  const handleProjectChange = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const params: Record<string, string> = { tab: activeTab };
    if (value && value !== '__none__') params.project = String(value);
    setSearchParams(params);
    setIsProjectOpen(false);
    setProjectFilter('');
  };

  return (
    <>
      <PageSection>
        <Flex alignItems={{ default: 'alignItemsFlexStart' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem style={{ paddingTop: 'var(--pf-t--global--spacer--xs)' }}>
            <DataGraphIcon />
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">Connections</Title>
            <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginTop: 'var(--pf-t--global--spacer--xs)' }}>
              Browse and manage data connections for your projects. View available catalogs or create and configure namespace-scoped connections.
            </Content>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Toolbar style={{ paddingLeft: 'var(--pf-t--global--spacer--lg)', paddingRight: 'var(--pf-t--global--spacer--lg)', paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
          <ToolbarContent>
            <ToolbarItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <Icon size="md"><RhFolderIcon /></Icon>
                    </FlexItem>
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
                        style={{ minWidth: 'var(--pf-t--global--spacer--4xl)' }}
                      >
                        {selectedProject || 'Select a project'}
                      </MenuToggle>
                    )}
                  >
                    <div style={{ padding: 'var(--pf-t--global--spacer--sm)' }}>
                      <SearchInput
                        placeholder="Filter projects"
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
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Tabs activeKey={activeTab} onSelect={handleTabSelect} style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}>
          <Tab eventKey="catalog" title={<TabTitleText>Catalog</TabTitleText>}>
            <ConnectionCatalog />
          </Tab>
          <Tab eventKey="connections" title={<TabTitleText>Connections</TabTitleText>}>
            <ConnectionsTab project={selectedProject || ''} connectionName={connectionName} />
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
};

export default ConnectionsPage;
