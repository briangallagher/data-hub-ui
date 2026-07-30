import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  TextInput,
  FormSelect,
  FormSelectOption,
  Alert,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core';
import { useCreateVolume, DataConnection } from './useCatalogApi';

interface RegisterVolumeModalProps {
  project: string;
  namespace: string;
  connections: DataConnection[];
  onClose: () => void;
}

const RegisterVolumeModal: React.FC<RegisterVolumeModalProps> = ({
  project,
  namespace,
  connections,
  onClose,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [connectionRef, setConnectionRef] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [contentType, setContentType] = React.useState('');
  const [error, setError] = React.useState('');
  const [accessMode, setAccessMode] = React.useState<'connection' | 'location'>('connection');

  // Properties state
  const [purpose, setPurpose] = React.useState('');
  const [license, setLicense] = React.useState('');
  const [maturity, setMaturity] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [agentTags, setAgentTags] = React.useState('');

  // Custom properties (key/value pairs)
  const [customKey, setCustomKey] = React.useState('');
  const [customValue, setCustomValue] = React.useState('');
  const [customProps, setCustomProps] = React.useState<Array<{ key: string; value: string }>>([]);

  const createMutation = useCreateVolume();

  const handleAddCustomProp = () => {
    if (customKey.trim()) {
      setCustomProps([...customProps, { key: customKey.trim(), value: customValue.trim() }]);
      setCustomKey('');
      setCustomValue('');
    }
  };

  const handleRemoveCustomProp = (index: number) => {
    setCustomProps(customProps.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (accessMode === 'location' && !location.trim()) {
      setError('Storage location is required');
      return;
    }
    if (accessMode === 'connection' && !connectionRef) {
      setError('Please select a connection');
      return;
    }
    setError('');

    // Build properties dict
    const customTagsMap: Record<string, string> = {};
    customProps.forEach((t) => { customTagsMap[t.key] = t.value; });

    const properties: Record<string, string> = {};
    if (purpose) properties.purpose = purpose;
    if (license) properties.license = license;
    if (maturity) properties.maturity = maturity;
    if (domain) properties.domain = domain;
    if (owner) properties.owner = owner;
    if (agentTags) properties.agent_tags = agentTags;
    Object.assign(properties, customTagsMap);

    try {
      await createMutation.mutateAsync({
        project,
        name: name.trim(),
        namespace,
        description,
        format: contentType,
        volumeType: 'EXTERNAL',
        location: accessMode === 'location' ? location : '',
        connectionRef: accessMode === 'connection' ? connectionRef : '',
        tags: {},
        isVolume: true,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create volume');
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Register volume"
    >
      <ModalHeader title="Register volume" />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Name" isRequired fieldId="volume-name">
            <TextInput
              id="volume-name"
              value={name}
              onChange={(_event, val) => setName(val)}
              isRequired
            />
          </FormGroup>

          <FormGroup label="Description" fieldId="volume-description">
            <TextInput
              id="volume-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
            />
          </FormGroup>

          <FormGroup label="Type" fieldId="volume-type">
            <TextInput
              id="volume-type"
              value="EXTERNAL"
              isDisabled
            />
          </FormGroup>

          <FormGroup label="Data access" fieldId="access-mode">
            <Flex>
              <FlexItem>
                <Button variant={accessMode === 'connection' ? 'primary' : 'secondary'} onClick={() => setAccessMode('connection')}>
                  Data Connection
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant={accessMode === 'location' ? 'primary' : 'secondary'} onClick={() => setAccessMode('location')}>
                  Storage location
                </Button>
              </FlexItem>
            </Flex>
          </FormGroup>

          {accessMode === 'connection' && (
            <FormGroup label="Connection" fieldId="volume-connection">
              <FormSelect
                id="volume-connection"
                value={connectionRef}
                onChange={(_event, val) => setConnectionRef(val)}
              >
                <FormSelectOption value="" label="Select a connection" />
                {connections.map((c) => (
                  <FormSelectOption
                    key={c.name}
                    value={c.name}
                    label={`${c.displayName} (${c.connectionType})`}
                  />
                ))}
              </FormSelect>
            </FormGroup>
          )}

          {accessMode === 'location' && (
            <FormGroup label="Storage location" fieldId="volume-location">
              <TextInput
                id="volume-location"
                value={location}
                onChange={(_event, val) => setLocation(val)}
                placeholder="e.g. s3://bucket/path, https://huggingface.co/datasets/..., https://github.com/..."
              />
            </FormGroup>
          )}

          <FormGroup label="Content type" fieldId="volume-content-type">
            <FormSelect
              id="volume-content-type"
              value={contentType}
              onChange={(_event, val) => setContentType(val)}
            >
              <FormSelectOption value="" label="Select content type" />
              <FormSelectOption value="application/pdf" label="application/pdf" />
              <FormSelectOption value="application/parquet" label="application/parquet" />
              <FormSelectOption value="text/csv" label="text/csv" />
              <FormSelectOption value="application/json" label="application/json" />
              <FormSelectOption value="dataset/huggingface" label="dataset/huggingface" />
              <FormSelectOption value="dataset/git" label="dataset/git" />
              <FormSelectOption value="image/mixed" label="image/mixed" />
              <FormSelectOption value="other" label="other" />
            </FormSelect>
          </FormGroup>

          <Title headingLevel="h3" size="md" style={{ marginTop: '16px', marginBottom: '8px' }}>
            Properties
          </Title>

          <FormGroup label="Purpose" fieldId="volume-purpose">
            <TextInput
              id="volume-purpose"
              value={purpose}
              onChange={(_event, val) => setPurpose(val)}
              placeholder="e.g. Risk assessment model training data"
            />
          </FormGroup>

          <FormGroup label="License" fieldId="volume-license">
            <FormSelect
              id="volume-license"
              value={license}
              onChange={(_event, val) => setLicense(val)}
            >
              <FormSelectOption value="" label="Select license" />
              <FormSelectOption value="internal-only" label="internal-only" />
              <FormSelectOption value="apache-2.0" label="apache-2.0" />
              <FormSelectOption value="mit" label="mit" />
              <FormSelectOption value="cc-by-4.0" label="cc-by-4.0" />
              <FormSelectOption value="proprietary" label="proprietary" />
              <FormSelectOption value="other" label="other" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Maturity" fieldId="volume-maturity">
            <FormSelect
              id="volume-maturity"
              value={maturity}
              onChange={(_event, val) => setMaturity(val)}
            >
              <FormSelectOption value="" label="Select maturity" />
              <FormSelectOption value="raw" label="raw" />
              <FormSelectOption value="curated" label="curated" />
              <FormSelectOption value="production" label="production" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Domain" fieldId="volume-domain">
            <TextInput
              id="volume-domain"
              value={domain}
              onChange={(_event, val) => setDomain(val)}
              placeholder="e.g. insurance, finance, healthcare"
            />
          </FormGroup>

          <FormGroup label="Owner" fieldId="volume-owner">
            <TextInput
              id="volume-owner"
              value={owner}
              onChange={(_event, val) => setOwner(val)}
              placeholder="e.g. underwriting-team"
            />
          </FormGroup>

          <FormGroup label="Agent tags" fieldId="volume-agent-tags">
            <TextInput
              id="volume-agent-tags"
              value={agentTags}
              onChange={(_event, val) => setAgentTags(val)}
              placeholder="e.g. risk, insurance, policies (comma-separated)"
            />
          </FormGroup>

          <FormGroup label="Custom properties" fieldId="volume-custom-props">
            <Flex>
              <FlexItem>
                <TextInput
                  id="vol-custom-key"
                  value={customKey}
                  onChange={(_event, val) => setCustomKey(val)}
                  placeholder="Key"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id="vol-custom-value"
                  value={customValue}
                  onChange={(_event, val) => setCustomValue(val)}
                  placeholder="Value"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={handleAddCustomProp}>
                  Add
                </Button>
              </FlexItem>
            </Flex>
            {customProps.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {customProps.map((prop, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>{prop.key}: {prop.value}</span>
                    <Button variant="plain" onClick={() => handleRemoveCustomProp(i)} style={{ padding: '2px' }}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={createMutation.isPending}
          isDisabled={createMutation.isPending}
        >
          Register
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RegisterVolumeModal;
