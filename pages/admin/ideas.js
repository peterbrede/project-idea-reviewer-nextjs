import { useCallback, useState } from "react";
import Head from "next/head";
import useSWR from "swr";
import fetch from "isomorphic-unfetch";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import BootstrapTable from "react-bootstrap-table-next";
import { getIdeas } from "../api/ideas";
import Layout from "../../components/Layout";
import { createRequiredAuth } from "../../utils/ssr";
import { serializeDocument } from "../../utils/mongodb";
import { useToasts } from "../../components/Toasts";

export const getServerSideProps = async ({ req, res }) => {
  const ssr = await createRequiredAuth({ roles: ["admin"] })({ req, res });

  ssr.props.initialData = (await getIdeas()).map(serializeDocument);

  return ssr;
};

function getColumnsWithActions(actionsFn) {
  return [
    {
      dataField: "_id",
      text: "User ID",
    },
    {
      dataField: "author",
      text: "Author",
    },
    {
      dataField: "title",
      text: "Title",
    },
    {
      dataField: "description",
      text: "Description",
    },
    {
      dataField: "df1",
      isDummyField: true,
      text: "# Reviews",
      formatter: (_, row) => row?.reviews?.length || 0,
    },
    {
      dataField: "df2",
      isDummyField: true,
      text: "Average Rating",
      formatter: (_, row) => {
        const reviews = row?.reviews;

        if (!reviews?.length) {
          return "--";
        }

        const totalScore = reviews
          .map((review) => review.rating)
          .reduce((a, b) => a + b);

        return totalScore / reviews.length;
      },
    },
    {
      dataField: "df3",
      isDummyField: true,
      text: "Actions",
      formatter: actionsFn,
    },
  ];
}

const rowStyle = { wordBreak: "break-all" };

export default function ManageAdminsPage(props) {
  const { user, initialData } = props;
  const { showToast } = useToasts();
  const { data, mutate } = useSWR("/api/ideas", { initialData });

  const deleteId = useCallback(async (ideaId) => {
    showToast(`Deleted idea ${data.find((u) => u._id === ideaId)?.title}`);
    await mutate(
      data.filter((u) => u._id !== ideaId),
      false
    );
    await fetch(`/api/ideas/${ideaId}`, { method: "DELETE" });
    await mutate();
  }, []);

  const columns = getColumnsWithActions((_, row) => {
    return (
      <Button variant="danger" onClick={() => deleteId(row._id)}>
        Delete
      </Button>
    );
  });

  return (
    <Layout user={user}>
      <Head>
        <title>Manage Ideas</title>
      </Head>
      <h1>Manage Ideas</h1>
      <BootstrapTable
        keyField="_id"
        data={data}
        columns={columns}
        rowStyle={rowStyle}
      />
    </Layout>
  );
}