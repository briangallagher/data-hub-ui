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
  Alert,
  Flex,
  FlexItem,
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

const EditTableModal: React.FC<EditTableModalProps> = ({
  project,
  namespace,
  name,
  currentDescription,
  currentProperties,
  onClose,
}) => {
  const [description, setDescription] = React.useState(currentDescription || '');
  const [tags, setTags] = React.useState<Array<{ key: string; value: string }>>(
    Object.entries(currentProperties)
      .filter(([k]) => !INTERNAL_KEYS.includes(k))
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
    tags.forEach((t) => { newProps[t.key] = t.value; });

    const oldKeys = Object.keys(currentProperties).filter((k) => !INTERNAL_KEYS.includes(k));
    const newKeys = tags.map((t) => t.key);
    const removedKeys = oldKeys.filter((k) => !newKeys.includes(k));

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

          <FormGroup label="Properties" fieldId="edit-table-tags">
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
