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
  Content,
  Popover,
  Title,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
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

  const [purpose, setPurpose] = React.useState(currentProperties.purpose || '');
  const [license, setLicense] = React.useState(currentProperties.license || '');
  const [maturity, setMaturity] = React.useState(currentProperties.maturity || '');
  const [domain, setDomain] = React.useState(currentProperties.domain || '');
  const [pii, setPii] = React.useState(currentProperties.pii || '');

  const [customProps, setCustomProps] = React.useState<Array<{ key: string; value: string }>>(
    Object.entries(currentProperties)
      .filter(([k]) => !INTERNAL_KEYS.includes(k) && !KNOWN_PROPERTY_KEYS.includes(k))
      .map(([key, value]) => ({ key, value })),
  );
  const [error, setError] = React.useState('');

  const updateMutation = useUpdateTable();

  const handleAddProperty = () => {
    setCustomProps([...customProps, { key: '', value: '' }]);
  };

  const handlePropertyChange = (index: number, field: 'key' | 'value', val: string) => {
    setCustomProps(customProps.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
  };

  const handleRemoveProperty = (index: number) => {
    setCustomProps(customProps.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');

    const newProps: Record<string, string> = {};
    if (description !== currentDescription) {
      newProps.comment = description;
      newProps.description = description;
    }

    if (purpose) newProps.purpose = purpose;
    if (license) newProps.license = license;
    if (maturity) newProps.maturity = maturity;
    if (domain) newProps.domain = domain;
    if (pii) newProps.pii = pii;

    customProps.forEach((p) => {
      if (p.key.trim()) newProps[p.key.trim()] = p.value.trim();
    });

    const allNewKeys = new Set<string>();
    if (purpose) allNewKeys.add('purpose');
    if (license) allNewKeys.add('license');
    if (maturity) allNewKeys.add('maturity');
    if (domain) allNewKeys.add('domain');
    if (pii) allNewKeys.add('pii');
    customProps.forEach((p) => { if (p.key.trim()) allNewKeys.add(p.key.trim()); });

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

          <FormGroup
            label="Labels"
            fieldId="edit-table-properties"
          >
            <HelperText style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}>
              <HelperTextItem>Optionally, add key/value pair labels to help organize and filter data.</HelperTextItem>
            </HelperText>
            {customProps.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <Flex style={{ marginBottom: '4px' }}>
                  <FlexItem style={{ flex: 1 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Key</span></FlexItem>
                  <FlexItem style={{ flex: 1 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Value</span></FlexItem>
                  <FlexItem style={{ width: '36px' }} />
                </Flex>
                {customProps.map((prop, i) => (
                  <Flex key={i} style={{ marginBottom: '8px' }} alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem style={{ flex: 1 }}>
                      <TextInput
                        id={`edit-prop-key-${i}`}
                        value={prop.key}
                        onChange={(_event, val) => handlePropertyChange(i, 'key', val)}
                        placeholder="Example: domain"
                      />
                    </FlexItem>
                    <FlexItem style={{ flex: 1 }}>
                      <TextInput
                        id={`edit-prop-value-${i}`}
                        value={prop.value}
                        onChange={(_event, val) => handlePropertyChange(i, 'value', val)}
                        placeholder="Example: underwriting"
                      />
                    </FlexItem>
                    <FlexItem style={{ width: '36px' }}>
                      <Button variant="plain" onClick={() => handleRemoveProperty(i)} aria-label="Remove property">
                        <MinusCircleIcon />
                      </Button>
                    </FlexItem>
                  </Flex>
                ))}
              </div>
            )}
            <Button variant="link" isInline icon={<PlusCircleIcon />} onClick={handleAddProperty}>
              Add property
            </Button>
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
