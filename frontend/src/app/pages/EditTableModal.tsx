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
import { useUpdateTable } from './useCatalogApi';

interface EditTableModalProps {
  project: string;
  namespace: string;
  name: string;
  currentDescription: string;
  currentProperties: Record<string, string>;
  onClose: () => void;
}

const INTERNAL_KEYS = ['_catalog_managed', 'asset_type', 'comment', 'description', 'connection-ref', 'format', 'location', 'namespace'];
const KNOWN_PROPERTY_KEYS = ['purpose', 'license', 'maturity', 'domain', 'owner', 'pii', 'agent_tags', 'registered_by', 'created_at'];

const EditTableModal: React.FC<EditTableModalProps> = ({
  project,
  namespace,
  name,
  currentDescription,
  currentProperties,
  onClose,
}) => {
  const [description, setDescription] = React.useState(currentDescription || '');

  // Structured property fields (pre-populated from existing properties)
  const [purpose, setPurpose] = React.useState(currentProperties.purpose || '');
  const [license, setLicense] = React.useState(currentProperties.license || '');
  const [maturity, setMaturity] = React.useState(currentProperties.maturity || '');
  const [domain, setDomain] = React.useState(currentProperties.domain || '');
  const [owner, setOwner] = React.useState(currentProperties.owner || '');
  const [pii, setPii] = React.useState(currentProperties.pii || '');
  const [agentTags, setAgentTags] = React.useState(currentProperties.agent_tags || '');

  // Custom properties (key/value pairs, excluding internal and known property keys)
  const [tags, setTags] = React.useState<Array<{ key: string; value: string }>>(
    Object.entries(currentProperties)
      .filter(([k]) => !INTERNAL_KEYS.includes(k) && !KNOWN_PROPERTY_KEYS.includes(k))
      .map(([key, value]) => ({ key, value })),
  );
  const [tagKey, setTagKey] = React.useState('');
  const [tagValue, setTagValue] = React.useState('');
  const [error, setError] = React.useState('');

  const updateMutation = useUpdateTable();

  const handleAddTag = () => {
    if (tagKey.trim()) {
      setTags([...tags, { key: tagKey.trim(), value: tagValue.trim() }]);
      setTagKey('');
      setTagValue('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');

    const newProps: Record<string, string> = {};
    if (description !== currentDescription) {
      newProps.comment = description;
      newProps.description = description;
    }

    // Add structured properties
    if (purpose) newProps.purpose = purpose;
    if (license) newProps.license = license;
    if (maturity) newProps.maturity = maturity;
    if (domain) newProps.domain = domain;
    if (owner) newProps.owner = owner;
    if (pii) newProps.pii = pii;
    if (agentTags) newProps.agent_tags = agentTags;

    // Add custom tags
    tags.forEach((t) => { newProps[t.key] = t.value; });

    // Calculate removed keys (old user-editable keys not present in new set)
    const allNewKeys = new Set<string>();
    if (purpose) allNewKeys.add('purpose');
    if (license) allNewKeys.add('license');
    if (maturity) allNewKeys.add('maturity');
    if (domain) allNewKeys.add('domain');
    if (owner) allNewKeys.add('owner');
    if (pii) allNewKeys.add('pii');
    if (agentTags) allNewKeys.add('agent_tags');
    tags.forEach((t) => allNewKeys.add(t.key));

    const oldEditableKeys = Object.keys(currentProperties).filter(
      (k) => !INTERNAL_KEYS.includes(k) && k !== 'registered_by' && k !== 'created_at',
    );
    const removedKeys = oldEditableKeys.filter((k) => !allNewKeys.has(k));

    try {
      await updateMutation.mutateAsync({
        project,
        namespace,
        name,
        setProperties: Object.keys(newProps).length > 0 ? newProps : undefined,
        removeProperties: removedKeys.length > 0 ? removedKeys : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update table');
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Edit table"
    >
      <ModalHeader title={`Edit table: ${name}`} />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Description" fieldId="edit-table-description">
            <TextInput
              id="edit-table-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
            />
          </FormGroup>

          <Title headingLevel="h3" size="md" style={{ marginTop: '16px', marginBottom: '8px' }}>
            Properties
          </Title>

          <FormGroup label="Purpose" fieldId="edit-table-purpose">
            <TextInput
              id="edit-table-purpose"
              value={purpose}
              onChange={(_event, val) => setPurpose(val)}
              placeholder="e.g. Risk assessment model training data"
            />
          </FormGroup>

          <FormGroup label="License" fieldId="edit-table-license">
            <FormSelect
              id="edit-table-license"
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

          <FormGroup label="Maturity" fieldId="edit-table-maturity">
            <FormSelect
              id="edit-table-maturity"
              value={maturity}
              onChange={(_event, val) => setMaturity(val)}
            >
              <FormSelectOption value="" label="Select maturity" />
              <FormSelectOption value="raw" label="raw" />
              <FormSelectOption value="curated" label="curated" />
              <FormSelectOption value="production" label="production" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Domain" fieldId="edit-table-domain">
            <TextInput
              id="edit-table-domain"
              value={domain}
              onChange={(_event, val) => setDomain(val)}
              placeholder="e.g. insurance, finance, healthcare"
            />
          </FormGroup>

          <FormGroup label="Owner" fieldId="edit-table-owner">
            <TextInput
              id="edit-table-owner"
              value={owner}
              onChange={(_event, val) => setOwner(val)}
              placeholder="e.g. underwriting-team"
            />
          </FormGroup>

          <FormGroup label="PII" fieldId="edit-table-pii">
            <FormSelect
              id="edit-table-pii"
              value={pii}
              onChange={(_event, val) => setPii(val)}
            >
              <FormSelectOption value="" label="Select PII status" />
              <FormSelectOption value="false" label="false" />
              <FormSelectOption value="true" label="true" />
              <FormSelectOption value="unknown" label="unknown" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Agent tags" fieldId="edit-table-agent-tags">
            <TextInput
              id="edit-table-agent-tags"
              value={agentTags}
              onChange={(_event, val) => setAgentTags(val)}
              placeholder="e.g. risk, insurance, policies (comma-separated)"
            />
          </FormGroup>

          <FormGroup label="Custom properties" fieldId="edit-table-tags">
            <Flex>
              <FlexItem>
                <TextInput
                  id="edit-tag-key"
                  value={tagKey}
                  onChange={(_event, val) => setTagKey(val)}
                  placeholder="Key"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id="edit-tag-value"
                  value={tagValue}
                  onChange={(_event, val) => setTagValue(val)}
                  placeholder="Value"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </FlexItem>
            </Flex>
            {tags.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {tags.map((tag, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{tag.key}:</span>
                    <TextInput
                      value={tag.value}
                      onChange={(_event, val) => {
                        const updated = [...tags];
                        updated[i] = { ...updated[i], value: val };
                        setTags(updated);
                      }}
                      style={{ width: '200px' }}
                    />
                    <Button variant="plain" onClick={() => handleRemoveTag(i)} style={{ padding: '2px' }}>
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
          isLoading={updateMutation.isPending}
          isDisabled={updateMutation.isPending}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditTableModal;
