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
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EditCollectionModalProps {
  project: string;
  name: string;
  currentDescription: string;
  currentProperties: Record<string, string>;
  onClose: () => void;
}

const CATALOG_BASE = '/data-hub/api/catalog';

const EditCollectionModal: React.FC<EditCollectionModalProps> = ({
  project,
  name,
  currentDescription,
  currentProperties,
  onClose,
}) => {
  const [description, setDescription] = React.useState(currentDescription || '');
  const [tags, setTags] = React.useState<Array<{ key: string; value: string }>>(
    Object.entries(currentProperties)
      .filter(([k]) => !k.startsWith('_') && k !== 'description')
      .map(([key, value]) => ({ key, value })),
  );
  const [tagKey, setTagKey] = React.useState('');
  const [tagValue, setTagValue] = React.useState('');
  const [error, setError] = React.useState('');

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (payload: { updates: Record<string, string>; removals: string[] }) => {
      const body: any = {};
      if (Object.keys(payload.updates).length > 0) body.updates = payload.updates;
      if (payload.removals.length > 0) body.removals = payload.removals;

      const resp = await fetch(
        `${CATALOG_BASE}/v1/${project}/namespaces/${name}/properties`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'kubeflow-userid': 'admin@example.com',
          },
          body: JSON.stringify(body),
        },
      );
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`API error: ${resp.status} ${resp.statusText} — ${text}`);
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'namespaces', project] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', project] });
    },
  });

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

    const updates: Record<string, string> = {};
    if (description !== currentDescription) {
      updates[`desc.${name}`] = description;
    }
    tags.forEach((t) => { updates[t.key] = t.value; });

    const oldKeys = Object.keys(currentProperties).filter((k) => !k.startsWith('_') && k !== 'description');
    const newKeys = tags.map((t) => t.key);
    const removals = oldKeys.filter((k) => !newKeys.includes(k));

    try {
      await updateMutation.mutateAsync({ updates, removals });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update collection');
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Edit collection"
    >
      <ModalHeader title={`Edit collection: ${name}`} />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Description" fieldId="edit-collection-description">
            <TextInput
              id="edit-collection-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
              placeholder="Collection description"
            />
          </FormGroup>

          <FormGroup label="Properties" fieldId="edit-collection-tags">
            <Flex>
              <FlexItem>
                <TextInput
                  id="edit-coll-tag-key"
                  value={tagKey}
                  onChange={(_event, val) => setTagKey(val)}
                  placeholder="Key"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id="edit-coll-tag-value"
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

export default EditCollectionModal;
